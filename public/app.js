import { applyTranslations, getLocale, setLocale, t } from "./i18n.js";

const refs = {
  statusText: document.querySelector("#statusText"),
  timer: document.querySelector("#timer"),
  permissionButton: document.querySelector("#permissionButton"),
  startButton: document.querySelector("#startButton"),
  stopButton: document.querySelector("#stopButton"),
  summarizeButton: document.querySelector("#summarizeButton"),
  downloadButton: document.querySelector("#downloadButton"),
  clearTranscriptButton: document.querySelector("#clearTranscriptButton"),
  transcript: document.querySelector("#transcript"),
  minutes: document.querySelector("#minutesContent"),
  meetingTitle: document.querySelector("#meetingTitle"),
  participants: document.querySelector("#participants"),
  language: document.querySelector("#language"),
  noiseReduction: document.querySelector("#noiseReduction"),
  audioInput: document.querySelector("#audioInput"),
  refreshDevicesButton: document.querySelector("#refreshDevicesButton"),
  localeButtons: document.querySelectorAll(".locale-toggle")
};

const state = {
  peerConnection: null,
  dataChannel: null,
  mediaStream: null,
  startedAt: 0,
  timerId: 0,
  transcriptItems: new Map(),
  itemOrder: [],
  minutes: null,
  meetingTitleEdited: false,
  statusKey: "status.idle",
  statusParams: {}
};

applyTranslations();
syncLocaleToggle();
refs.meetingTitle.value = t("defaults.meetingTitle");
setEmptyMinutes();

refs.startButton.addEventListener("click", startMeeting);
refs.permissionButton.addEventListener("click", requestMicrophonePermission);
refs.stopButton.addEventListener("click", stopMeeting);
refs.summarizeButton.addEventListener("click", summarizeMeeting);
refs.downloadButton.addEventListener("click", downloadMinutes);
refs.clearTranscriptButton.addEventListener("click", clearTranscript);
refs.refreshDevicesButton.addEventListener("click", refreshAudioInputs);
refs.meetingTitle.addEventListener("input", () => {
  state.meetingTitleEdited = true;
});
refs.localeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLocale(button.dataset.locale);
    renderLocalizedUi();
  });
});

refreshAudioInputs();
if (navigator.mediaDevices?.addEventListener) {
  navigator.mediaDevices.addEventListener("devicechange", refreshAudioInputs);
}

async function startMeeting() {
  setBusy(true);
  setStatus("status.checkingMicrophone");

  try {
    const stream = await openMicrophone();

    setStatus("status.preparingRealtime");
    const tokenResponse = await fetch("/api/realtime/client-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: refs.language.value,
        noiseReduction: refs.noiseReduction.value,
        prompt: buildVocabularyPrompt()
      })
    });

    const tokenPayload = await readJsonResponse(tokenResponse);
    const ephemeralKey =
      tokenPayload.value || tokenPayload.client_secret?.value || tokenPayload.session?.client_secret?.value;

    if (!ephemeralKey) {
      throw new Error("Realtime client secret response did not include a token.");
    }

    const pc = new RTCPeerConnection();
    const dc = pc.createDataChannel("oai-events");

    stream.getAudioTracks().forEach((track) => pc.addTrack(track, stream));
    dc.addEventListener("message", (event) => handleRealtimeEvent(JSON.parse(event.data)));
    dc.addEventListener("open", () => setStatus("status.receivingTranscript"));
    dc.addEventListener("close", () => setStatus("status.realtimeClosed"));
    pc.addEventListener("connectionstatechange", () => {
      if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setStatus("status.connectionState", { state: pc.connectionState });
      }
    });

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${ephemeralKey}`,
        "Content-Type": "application/sdp"
      }
    });

    if (!sdpResponse.ok) {
      throw new Error(await sdpResponse.text());
    }

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text()
    };
    await pc.setRemoteDescription(answer);

    state.peerConnection = pc;
    state.dataChannel = dc;
    state.mediaStream = stream;
    state.startedAt = Date.now();
    state.timerId = window.setInterval(updateTimer, 500);
    updateTimer();

    refs.startButton.disabled = true;
    refs.stopButton.disabled = false;
    refs.summarizeButton.disabled = true;
    setStatus("status.microphoneInput");
    refreshAudioInputs();
  } catch (error) {
    stopMeeting();
    setStatus("status.error", { message: messageFromError(error) });
  } finally {
    setBusy(false);
  }
}

async function requestMicrophonePermission() {
  setBusy(true);
  setStatus("status.requestingMicrophone");

  try {
    const stream = await openMicrophone();
    stream.getTracks().forEach((track) => track.stop());
    await refreshAudioInputs();
    setStatus("status.microphoneReady");
  } catch (error) {
    setStatus("status.error", { message: messageFromError(error) });
  } finally {
    setBusy(false);
  }
}

function stopMeeting() {
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((track) => track.stop());
  }
  if (state.dataChannel && state.dataChannel.readyState === "open") {
    state.dataChannel.close();
  }
  if (state.peerConnection) {
    state.peerConnection.close();
  }
  if (state.timerId) {
    window.clearInterval(state.timerId);
  }

  state.mediaStream = null;
  state.dataChannel = null;
  state.peerConnection = null;
  state.timerId = 0;

  refs.startButton.disabled = false;
  refs.stopButton.disabled = true;
  refs.summarizeButton.disabled = !getTranscriptText().trim();
  setStatus(getTranscriptText().trim() ? "status.meetingEnded" : "status.idle");
}

async function openMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(t("errors.unsupportedBrowser"));
  }

  const selectedDeviceId = refs.audioInput.value;
  return navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });
}

async function refreshAudioInputs() {
  if (!navigator.mediaDevices?.enumerateDevices) {
    refs.audioInput.innerHTML = `<option value="">${escapeHtml(t("devices.unavailable"))}</option>`;
    return;
  }

  const previousValue = refs.audioInput.value;
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter((device) => device.kind === "audioinput");
    const options = [`<option value="">${escapeHtml(t("devices.defaultMicrophone"))}</option>`];

    audioInputs.forEach((device, index) => {
      const label = device.label || t("devices.microphoneNumber", { number: index + 1 });
      options.push(`<option value="${escapeHtml(device.deviceId)}">${escapeHtml(label)}</option>`);
    });

    refs.audioInput.innerHTML = options.join("");
    if (audioInputs.some((device) => device.deviceId === previousValue)) {
      refs.audioInput.value = previousValue;
    }

    if (!audioInputs.length) {
      setStatus("status.microphoneNotFound");
    }
  } catch {
    refs.audioInput.innerHTML = `<option value="">${escapeHtml(t("devices.defaultMicrophone"))}</option>`;
  }
}

async function summarizeMeeting() {
  const transcript = getTranscriptText().trim();
  if (!transcript) {
    setStatus("status.noTranscript");
    return;
  }

  refs.summarizeButton.disabled = true;
  refs.minutes.textContent = t("minutes.loading");
  refs.minutes.classList.add("empty-state");
  setStatus("status.summarizing");

  try {
    const response = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: refs.meetingTitle.value,
        participants: parseParticipants(refs.participants.value),
        outputLanguage: getLocale(),
        transcript
      })
    });

    const data = await readJsonResponse(response);
    state.minutes = data.minutes;
    renderMinutes(data.minutes);
    refs.downloadButton.disabled = false;
    setStatus("status.summaryComplete");
  } catch (error) {
    refs.minutes.textContent = messageFromError(error);
    refs.minutes.classList.add("empty-state");
    setStatus("status.summaryFailed");
  } finally {
    refs.summarizeButton.disabled = false;
  }
}

function handleRealtimeEvent(event) {
  if (
    event.type !== "conversation.item.input_audio_transcription.delta" &&
    event.type !== "conversation.item.input_audio_transcription.completed"
  ) {
    return;
  }

  const itemId = event.item_id || `item-${state.itemOrder.length}`;
  const item = getTranscriptItem(itemId);

  if (event.type === "conversation.item.input_audio_transcription.delta") {
    item.draft += event.delta || "";
  }

  if (event.type === "conversation.item.input_audio_transcription.completed") {
    item.final = event.transcript || item.draft;
    item.draft = "";
  }

  renderTranscript();
}

function getTranscriptItem(itemId) {
  if (!state.transcriptItems.has(itemId)) {
    state.itemOrder.push(itemId);
    state.transcriptItems.set(itemId, { final: "", draft: "" });
  }
  return state.transcriptItems.get(itemId);
}

function renderTranscript() {
  const fragments = [];
  for (const itemId of state.itemOrder) {
    const item = state.transcriptItems.get(itemId);
    if (item.final) {
      fragments.push(escapeHtml(item.final));
    }
    if (item.draft) {
      fragments.push(`<span class="draft">${escapeHtml(item.draft)}</span>`);
    }
  }

  refs.transcript.innerHTML = fragments.join("\n\n");
  refs.transcript.scrollTop = refs.transcript.scrollHeight;
  refs.summarizeButton.disabled = !getTranscriptText().trim() || Boolean(state.peerConnection);
}

function getTranscriptText() {
  return state.itemOrder
    .map((itemId) => {
      const item = state.transcriptItems.get(itemId);
      return `${item.final || ""}${item.draft || ""}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function clearTranscript() {
  state.transcriptItems.clear();
  state.itemOrder = [];
  state.minutes = null;
  refs.transcript.textContent = "";
  setEmptyMinutes();
  refs.summarizeButton.disabled = true;
  refs.downloadButton.disabled = true;
  setStatus("status.idle");
}

function renderMinutes(minutes) {
  refs.minutes.classList.remove("empty-state");
  refs.minutes.innerHTML = [
    section(t("minutes.summary"), list(minutes.summary)),
    section(t("minutes.decisions"), list(minutes.decisions)),
    section(t("minutes.todos"), todoList(minutes.action_items)),
    section(t("minutes.risks"), list(minutes.risks)),
    section(t("minutes.openQuestions"), list(minutes.open_questions)),
    section(
      t("minutes.emailDraft"),
      `<div class="email-preview"><strong>${escapeHtml(minutes.follow_up_email.subject)}</strong>\n\n${escapeHtml(
        minutes.follow_up_email.body
      )}</div>`
    )
  ].join("");
}

function section(title, content) {
  return `<section class="minutes-section"><h3>${escapeHtml(title)}</h3>${content}</section>`;
}

function list(items) {
  if (!items || !items.length) {
    return `<p class="empty-state">${escapeHtml(t("minutes.none"))}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function todoList(items) {
  if (!items || !items.length) {
    return `<p class="empty-state">${escapeHtml(t("minutes.none"))}</p>`;
  }

  return `<ul class="todo-list">${items
    .map(
      (item) => `<li class="todo-item">
        <strong>${escapeHtml(item.task)}</strong>
        <div class="todo-meta">
          <span>${escapeHtml(t("todo.owner"))}: ${escapeHtml(item.owner)}</span>
          <span>${escapeHtml(t("todo.dueDate"))}: ${escapeHtml(item.due_date)}</span>
          <span>${escapeHtml(t("todo.priority"))}: ${escapeHtml(item.priority)}</span>
          <span>${escapeHtml(t("todo.status"))}: ${escapeHtml(item.status)}</span>
        </div>
      </li>`
    )
    .join("")}</ul>`;
}

function setEmptyMinutes() {
  refs.minutes.textContent = t("minutes.empty");
  refs.minutes.classList.add("empty-state");
}

function downloadMinutes() {
  if (!state.minutes) {
    return;
  }

  const payload = {
    locale: getLocale(),
    minutes: state.minutes,
    transcript: getTranscriptText()
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const safeTitle = (state.minutes.title || "meeting-minutes")
    .replace(/[\\/:*?"<>|]/g, "-")
    .slice(0, 80);

  anchor.href = url;
  anchor.download = `${safeTitle}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function parseParticipants(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildVocabularyPrompt() {
  const participants = parseParticipants(refs.participants.value);
  if (!participants.length) {
    return "";
  }
  return `Names and terms: ${participants.join(", ")}`;
}

async function readJsonResponse(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message =
      data.error?.message || (typeof data.error === "string" ? data.error : "") || text || response.statusText;
    throw new Error(message);
  }
  return data;
}

function updateTimer() {
  if (!state.startedAt) {
    refs.timer.textContent = "00:00";
    return;
  }
  const seconds = Math.floor((Date.now() - state.startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  refs.timer.textContent = `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function setBusy(isBusy) {
  refs.permissionButton.disabled = isBusy || Boolean(state.peerConnection);
  refs.startButton.disabled = isBusy || Boolean(state.peerConnection);
  refs.refreshDevicesButton.disabled = isBusy;
}

function setStatus(key, params = {}) {
  state.statusKey = key;
  state.statusParams = params;
  refs.statusText.textContent = t(key, params);
}

function renderLocalizedUi() {
  applyTranslations();
  syncLocaleToggle();

  if (!state.meetingTitleEdited) {
    refs.meetingTitle.value = t("defaults.meetingTitle");
  }

  refs.statusText.textContent = t(state.statusKey, state.statusParams);
  if (state.minutes) {
    renderMinutes(state.minutes);
  } else {
    setEmptyMinutes();
  }
  refreshAudioInputs();
}

function syncLocaleToggle() {
  const locale = getLocale();
  refs.localeButtons.forEach((button) => {
    const isActive = button.dataset.locale === locale;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function messageFromError(error) {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return t("errors.micNotFound");
  }
  if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
    return t("errors.permissionDenied");
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return t("errors.micNotReadable");
  }
  if (error.name === "OverconstrainedError") {
    return t("errors.micOverconstrained");
  }
  if (error.name === "SecurityError") {
    return t("errors.security");
  }

  return error.message;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
