import { GoogleGenAI } from "@google/genai";
import { HttpError } from "./http.js";
export function configured() {
  return Boolean(process.env.GEMINI_API_KEY);
}
export async function generate({
  system,
  prompt,
  schema,
  image,
  model,
  timeoutMs = 25000,
}) {
  if (!configured())
    throw new HttpError(
      503,
      "Gemini is not configured. Add GEMINI_API_KEY on the server.",
    );
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: timeoutMs },
  });
  const input = image
    ? [
        { type: "text", text: prompt },
        { type: "image", mime_type: image.mimeType, data: image.data },
      ]
    : prompt;
  let response;
  let timer;
  const controller = new AbortController();
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(
        new HttpError(
          503,
          "Gemini took too long to respond. Please try again.",
        ),
      );
    }, timeoutMs);
  });
  try {
    response = await Promise.race([
      ai.interactions.create(
        {
          model: model || process.env.GEMINI_MODEL || "gemini-3.8-flash",
          input,
          system_instruction: system,
          generation_config: { max_output_tokens: 4096, thinking_level: "low" },
          store: false,
          ...(schema
            ? {
                response_format: {
                  type: "text",
                  mime_type: "application/json",
                  schema,
                },
              }
            : {}),
        },
        {
          timeout_ms: timeoutMs,
          retries: { strategy: "none" },
          signal: controller.signal,
        },
      ),
      deadline,
    ]);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    const status = error.status || error.statusCode || error.code;
    if (
      error.name === "AbortError" ||
      error.name === "TimeoutError" ||
      /timed out|timeout/i.test(error.message || "")
    )
      throw new HttpError(
        503,
        "Gemini took too long to respond. Please try again.",
      );
    if ([503, 504].includes(status))
      throw new HttpError(503, "Gemini is temporarily busy. Please try again.");
    if (status === 429)
      throw new HttpError(
        429,
        "Gemini's usage limit was reached. Please try again later.",
      );
    throw error;
  } finally {
    clearTimeout(timer);
  }
  if (response.status !== "completed" || !response.output_text)
    throw new HttpError(
      502,
      "Gemini could not finish the response. Please try again.",
    );
  return schema ? JSON.parse(response.output_text) : response.output_text;
}
