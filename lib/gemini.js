import { GoogleGenAI } from "@google/genai";
import { HttpError } from "./http.js";
export function configured() {
  return Boolean(process.env.GEMINI_API_KEY);
}
export async function generate({ system, prompt, schema, image, model }) {
  if (!configured())
    throw new HttpError(
      503,
      "Gemini is not configured. Add GEMINI_API_KEY on the server.",
    );
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { timeout: 25000 },
  });
  const parts = [{ text: prompt }];
  if (image) parts.push({ inlineData: image });
  const response = await ai.models.generateContent({
    model: model || process.env.GEMINI_MODEL || "gemini-3.8-flash",
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction: system,
      maxOutputTokens: 4096,
      ...(schema
        ? { responseMimeType: "application/json", responseJsonSchema: schema }
        : {}),
    },
  });
  if (!response.text) throw new Error("Gemini returned no text.");
  return schema ? JSON.parse(response.text) : response.text;
}
