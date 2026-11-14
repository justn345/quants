// NEAR AI Cloud (OpenAI-compatible). Server-side only: the key never reaches the browser.
// Base URL and model list verified at https://docs.near.ai and GET /v1/models on 2026-11-13.
export const NEAR_AI_BASE_URL = "https://cloud-api.near.ai/v1";
// Small, cheap open-weights model for summaries and parsing. Override with NEAR_AI_MODEL.
export const DEFAULT_MODEL = "z-ai/glm-5.3-flash";

export interface ChatMessage { role: "system" | "user" | "assistant"; content: string }

export class NearAiUnavailable extends Error {}

export async function nearChat(
  messages: ChatMessage[],
  opts: { apiKey?: string; model?: string; maxTokens?: number; timeoutMs?: number; json?: boolean } = {},
): Promise<string> {
  const apiKey = opts.apiKey ?? (typeof process !== "undefined" ? process.env.NEAR_AI_API_KEY : undefined);
  if (!apiKey) throw new NearAiUnavailable("NEAR_AI_API_KEY not set");
  const model = opts.model ?? (typeof process !== "undefined" ? process.env.NEAR_AI_MODEL : undefined) ?? DEFAULT_MODEL;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  try {
    const res = await fetch(`${NEAR_AI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: opts.maxTokens ?? 160,
        temperature: 0.2,
        ...(opts.json ? { response_format: { type: "json_object" } } : {}),
      }),
      signal: ctrl.signal,
    });
    // Never log the key or full bodies; status only.
    if (!res.ok) throw new NearAiUnavailable(`NEAR AI HTTP ${res.status}`);
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = j.choices?.[0]?.message?.content?.trim();
    if (!text) throw new NearAiUnavailable("Empty NEAR AI response");
    return text;
  } catch (e) {
    if (e instanceof NearAiUnavailable) throw e;
    throw new NearAiUnavailable(e instanceof Error ? e.name : "NEAR AI error");
  } finally {
    clearTimeout(t);
  }
}

/** Strip control chars and cap length before any user text goes into a prompt. */
export function sanitizeUserText(s: string, max = 280): string {
  return s.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
