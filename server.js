import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

loadDotEnv();

const port = Number(process.env.PORT || 3000);
const apiKey = process.env.OPENAI_API_KEY;
const transcriptionModel =
  process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";
const summaryModel = process.env.OPENAI_SUMMARY_MODEL || "gpt-5.5";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const minutesSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "participants",
    "language",
    "summary",
    "decisions",
    "action_items",
    "risks",
    "open_questions",
    "follow_up_email"
  ],
  properties: {
    title: { type: "string" },
    participants: { type: "array", items: { type: "string" } },
    language: { type: "string" },
    summary: { type: "array", items: { type: "string" } },
    decisions: { type: "array", items: { type: "string" } },
    action_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "task",
          "owner",
          "due_date",
          "priority",
          "status",
          "source_quote"
        ],
        properties: {
          task: { type: "string" },
          owner: { type: "string" },
          due_date: { type: "string" },
          priority: {
            type: "string",
            enum: ["high", "medium", "low", "unknown"]
          },
          status: {
            type: "string",
            enum: ["todo", "in_progress", "blocked", "done", "unknown"]
          },
          source_quote: { type: "string" }
        }
      }
    },
    risks: { type: "array", items: { type: "string" } },
    open_questions: { type: "array", items: { type: "string" } },
    follow_up_email: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" }
      }
    }
  }
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/realtime/client-secret") {
      await handleRealtimeClientSecret(req, res);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/summarize") {
      await handleSummarize(req, res);
      return;
    }

    if (req.method === "GET") {
      await serveStatic(url.pathname, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, error.statusCode || 500, {
      error: error.expose ? error.message : "Internal server error"
    });
  }
});

server.listen(port, () => {
  console.log(`Meeting minutes MVP: http://localhost:${port}`);
});

async function handleRealtimeClientSecret(req, res) {
  ensureApiKey();

  const body = await readJson(req);
  const language = normalizeLanguage(body.language);
  const prompt = normalizeOptionalString(body.prompt, 800);
  const noiseReduction = normalizeNoiseReduction(body.noiseReduction);
  const model = normalizeOptionalString(body.model, 80) || transcriptionModel;

  const transcription = { model };
  if (language) {
    transcription.language = language;
  }
  if (prompt) {
    transcription.prompt = prompt;
  }

  const input = {
    format: { type: "audio/pcm", rate: 24000 },
    noise_reduction: { type: noiseReduction },
    transcription
  };

  input.turn_detection =
    model === "gpt-realtime-whisper"
      ? null
      : {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 700
        };

  const openAiResponse = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Safety-Identifier": "local-meeting-minutes-mvp"
    },
    body: JSON.stringify({
      session: {
        type: "transcription",
        audio: { input },
        include: []
      }
    })
  });

  const text = await openAiResponse.text();
  if (!openAiResponse.ok) {
    sendJson(res, openAiResponse.status, safeError(text));
    return;
  }

  sendJson(res, 200, JSON.parse(text));
}

async function handleSummarize(req, res) {
  ensureApiKey();

  const body = await readJson(req);
  const transcript = normalizeRequiredString(body.transcript, 200000, "transcript");
  const title = normalizeOptionalString(body.title, 160) || "Untitled meeting";
  const participants = Array.isArray(body.participants)
    ? body.participants
        .map((value) => normalizeOptionalString(value, 80))
        .filter(Boolean)
    : [];
  const outputLanguage = normalizeOutputLanguage(body.outputLanguage);
  const outputLanguageName = outputLanguage === "en" ? "English" : "Korean";
  const unknownValue = outputLanguage === "en" ? "Unknown" : "미정";

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: summaryModel,
      reasoning: { effort: "low" },
      instructions: [
        "Create accurate meeting minutes from the transcript.",
        `Write every user-facing field in ${outputLanguageName}.`,
        "Preserve names, product names, and quoted source text in their original language when that is more accurate.",
        "Do not invent owners, dates, or decisions.",
        `If an owner or due date is unclear, use "${unknownValue}".`,
        "Keep action items concrete and verifiable."
      ].join(" "),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Meeting title: ${title}`,
                `Known participants: ${participants.join(", ") || "unknown"}`,
                "",
                "Transcript:",
                transcript
              ].join("\n")
            }
          ]
        }
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "meeting_minutes",
          strict: true,
          schema: minutesSchema
        }
      }
    })
  });

  const responseText = await openAiResponse.text();
  if (!openAiResponse.ok) {
    sendJson(res, openAiResponse.status, safeError(responseText));
    return;
  }

  const data = JSON.parse(responseText);
  const outputText = extractResponseText(data);
  const minutes = JSON.parse(outputText);
  sendJson(res, 200, { minutes, raw_response_id: data.id });
}

async function serveStatic(pathname, res) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const normalized = path.normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(publicDir, normalized);

  if (!filePath.startsWith(publicDir)) {
    sendText(res, 403, "Forbidden", "text/plain; charset=utf-8");
    return;
  }

  try {
    const data = await readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath)] || "application/octet-stream";
    sendBuffer(res, 200, data, contentType);
  } catch {
    sendText(res, 404, "Not found", "text/plain; charset=utf-8");
  }
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") {
    return data.output_text;
  }

  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  if (!chunks.length) {
    throw new Error("OpenAI response did not include text output.");
  }
  return chunks.join("");
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (!chunks.length) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(res, status, payload) {
  sendText(res, status, JSON.stringify(payload), "application/json; charset=utf-8");
}

function sendText(res, status, text, contentType) {
  const body = Buffer.from(text);
  sendBuffer(res, status, body, contentType);
}

function sendBuffer(res, status, body, contentType) {
  res.writeHead(status, {
    "Content-Type": contentType,
    "Content-Length": body.length,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function ensureApiKey() {
  if (!apiKey) {
    const error = new Error("OPENAI_API_KEY is required.");
    error.statusCode = 500;
    error.expose = true;
    throw error;
  }
}

function normalizeLanguage(value) {
  const language = normalizeOptionalString(value, 12);
  if (!language || language === "auto") {
    return "";
  }
  return language;
}

function normalizeNoiseReduction(value) {
  return value === "near_field" ? "near_field" : "far_field";
}

function normalizeOutputLanguage(value) {
  return value === "en" ? "en" : "ko";
}

function normalizeOptionalString(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().slice(0, maxLength);
}

function normalizeRequiredString(value, maxLength, fieldName) {
  const normalized = normalizeOptionalString(value, maxLength);
  if (!normalized) {
    const error = new Error(`${fieldName} is required.`);
    error.statusCode = 400;
    error.expose = true;
    throw error;
  }
  return normalized;
}

function safeError(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text || "OpenAI API request failed" };
  }
}

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) {
    return;
  }

  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}
