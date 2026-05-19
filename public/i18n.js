const STORAGE_KEY = "meeting-minutes-locale";

const dictionaries = {
  ko: {
    "app.title": "Meeting Minutes",
    "landing.eyebrow": "AI 회의록 자동화",
    "landing.title": "Meeting Minutes",
    "landing.copy": "오프라인 회의 음성을 실시간으로 기록하고, 회의가 끝나면 요약과 TODO를 바로 정리합니다.",
    "landing.primaryCta": "회의 시작하기",
    "landing.secondaryCta": "결과 예시 보기",
    "landing.point1Value": "Live",
    "landing.point1Label": "실시간 STT",
    "landing.point2Value": "KO/EN",
    "landing.point2Label": "다국어 회의",
    "landing.point3Value": "TODO",
    "landing.point3Label": "액션아이템 추출",
    "aria.meetingDetails": "회의 정보",
    "form.uiLanguage": "UI 언어",
    "form.meetingTitle": "회의 제목",
    "form.participants": "참석자",
    "form.languageHint": "언어 힌트",
    "form.microphoneEnvironment": "마이크 환경",
    "form.microphone": "마이크",
    "language.auto": "자동",
    "language.ko": "한국어",
    "language.en": "English",
    "language.ja": "日本語",
    "language.zh": "中文",
    "language.outputName": "Korean",
    "microphone.farField": "회의실/노트북",
    "microphone.nearField": "헤드셋/가까운 마이크",
    "devices.defaultMicrophone": "기본 마이크",
    "devices.unavailable": "마이크 목록 사용 불가",
    "devices.microphoneNumber": "마이크 {number}",
    "actions.start": "녹음 시작",
    "actions.stop": "중지",
    "actions.requestMicrophone": "마이크 권한",
    "actions.refresh": "새로고침",
    "actions.clear": "비우기",
    "actions.summarize": "요약 생성",
    "actions.download": "내보내기",
    "panels.transcript": "실시간 Transcript",
    "panels.minutes": "회의록",
    "placeholders.participants": "홍길동, Jane, Alex",
    "defaults.meetingTitle": "오프라인 회의",
    "status.idle": "대기 중",
    "status.checkingMicrophone": "마이크 확인 중",
    "status.requestingMicrophone": "마이크 권한 요청 중",
    "status.microphoneReady": "마이크 사용 가능",
    "status.preparingRealtime": "Realtime 세션 준비 중",
    "status.receivingTranscript": "실시간 transcript 수신 중",
    "status.realtimeClosed": "Realtime 연결 종료",
    "status.connectionState": "연결 상태: {state}",
    "status.microphoneInput": "마이크 입력 중",
    "status.meetingEnded": "회의 종료됨",
    "status.microphoneNotFound": "마이크 장치를 찾지 못했습니다",
    "status.noTranscript": "요약할 transcript가 없습니다",
    "status.summarizing": "회의록 생성 중",
    "status.summaryComplete": "회의록 생성 완료",
    "status.summaryFailed": "요약 생성 실패",
    "status.error": "오류: {message}",
    "minutes.empty": "회의가 끝나면 요약을 생성하세요.",
    "minutes.loading": "요약 생성 중...",
    "minutes.summary": "요약",
    "minutes.decisions": "결정사항",
    "minutes.todos": "TODO",
    "minutes.risks": "리스크",
    "minutes.openQuestions": "열린 질문",
    "minutes.emailDraft": "이메일 초안",
    "minutes.none": "없음",
    "todo.owner": "담당",
    "todo.dueDate": "마감",
    "todo.priority": "우선순위",
    "todo.status": "상태",
    "errors.unsupportedBrowser": "이 브라우저는 마이크 입력을 지원하지 않습니다.",
    "errors.micNotFound":
      "마이크 장치를 찾지 못했습니다. Windows 입력 장치와 브라우저 마이크 권한을 확인한 뒤 마이크 목록을 새로고침하세요.",
    "errors.permissionDenied":
      "브라우저에서 마이크 권한이 거부되었습니다. 주소창의 사이트 권한에서 마이크를 허용하세요.",
    "errors.micNotReadable": "마이크를 열 수 없습니다. 다른 앱이 마이크를 사용 중인지 확인하세요.",
    "errors.micOverconstrained": "선택한 마이크를 사용할 수 없습니다. 기본 마이크를 선택한 뒤 다시 시도하세요.",
    "errors.security": "보안 설정 때문에 마이크 접근이 차단되었습니다. localhost 또는 HTTPS에서 실행해야 합니다."
  },
  en: {
    "app.title": "Meeting Minutes",
    "landing.eyebrow": "AI meeting minutes",
    "landing.title": "Meeting Minutes",
    "landing.copy": "Capture offline meetings in real time, then turn the transcript into a concise summary and TODO list when the meeting ends.",
    "landing.primaryCta": "Start meeting",
    "landing.secondaryCta": "View output",
    "landing.point1Value": "Live",
    "landing.point1Label": "Realtime STT",
    "landing.point2Value": "KO/EN",
    "landing.point2Label": "Multilingual",
    "landing.point3Value": "TODO",
    "landing.point3Label": "Action items",
    "aria.meetingDetails": "Meeting details",
    "form.uiLanguage": "UI language",
    "form.meetingTitle": "Meeting title",
    "form.participants": "Participants",
    "form.languageHint": "Language hint",
    "form.microphoneEnvironment": "Mic environment",
    "form.microphone": "Microphone",
    "language.auto": "Auto",
    "language.ko": "Korean",
    "language.en": "English",
    "language.ja": "Japanese",
    "language.zh": "Chinese",
    "language.outputName": "English",
    "microphone.farField": "Room/laptop",
    "microphone.nearField": "Headset/close mic",
    "devices.defaultMicrophone": "Default microphone",
    "devices.unavailable": "Microphone list unavailable",
    "devices.microphoneNumber": "Microphone {number}",
    "actions.start": "Start recording",
    "actions.stop": "Stop",
    "actions.requestMicrophone": "Mic access",
    "actions.refresh": "Refresh",
    "actions.clear": "Clear",
    "actions.summarize": "Generate summary",
    "actions.download": "Export",
    "panels.transcript": "Live Transcript",
    "panels.minutes": "Minutes",
    "placeholders.participants": "Jane, Alex, Hong Gil-dong",
    "defaults.meetingTitle": "Offline meeting",
    "status.idle": "Idle",
    "status.checkingMicrophone": "Checking microphone",
    "status.requestingMicrophone": "Requesting microphone permission",
    "status.microphoneReady": "Microphone ready",
    "status.preparingRealtime": "Preparing Realtime session",
    "status.receivingTranscript": "Receiving live transcript",
    "status.realtimeClosed": "Realtime connection closed",
    "status.connectionState": "Connection state: {state}",
    "status.microphoneInput": "Microphone input active",
    "status.meetingEnded": "Meeting ended",
    "status.microphoneNotFound": "No microphone device found",
    "status.noTranscript": "There is no transcript to summarize",
    "status.summarizing": "Generating minutes",
    "status.summaryComplete": "Minutes generated",
    "status.summaryFailed": "Summary generation failed",
    "status.error": "Error: {message}",
    "minutes.empty": "Generate a summary after the meeting ends.",
    "minutes.loading": "Generating summary...",
    "minutes.summary": "Summary",
    "minutes.decisions": "Decisions",
    "minutes.todos": "TODO",
    "minutes.risks": "Risks",
    "minutes.openQuestions": "Open Questions",
    "minutes.emailDraft": "Email Draft",
    "minutes.none": "None",
    "todo.owner": "Owner",
    "todo.dueDate": "Due",
    "todo.priority": "Priority",
    "todo.status": "Status",
    "errors.unsupportedBrowser": "This browser does not support microphone input.",
    "errors.micNotFound":
      "No microphone device was found. Check your Windows input device and browser microphone permission, then refresh the microphone list.",
    "errors.permissionDenied":
      "Microphone permission was denied in the browser. Allow microphone access in the site permissions near the address bar.",
    "errors.micNotReadable": "The microphone cannot be opened. Check whether another app is using it.",
    "errors.micOverconstrained": "The selected microphone cannot be used. Select the default microphone and try again.",
    "errors.security": "Microphone access is blocked by security settings. Run on localhost or HTTPS."
  }
};

let currentLocale = normalizeLocale(localStorage.getItem(STORAGE_KEY) || navigator.language);

export function getLocale() {
  return currentLocale;
}

export function setLocale(locale) {
  currentLocale = normalizeLocale(locale);
  localStorage.setItem(STORAGE_KEY, currentLocale);
}

export function t(key, params = {}) {
  const dictionary = dictionaries[currentLocale] || dictionaries.ko;
  const fallback = dictionaries.ko[key] || key;
  const template = dictionary[key] || fallback;

  return template.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

export function applyTranslations(root = document) {
  document.documentElement.lang = currentLocale;
  document.title = t("app.title");

  root.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  });

  root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  });
}

function normalizeLocale(locale) {
  return String(locale || "").toLowerCase().startsWith("en") ? "en" : "ko";
}
