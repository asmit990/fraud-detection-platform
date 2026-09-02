import { Transaction } from "../types";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
const GEMINI_TIMEOUT_MS = 3500;

export interface GeminiFraudResult {
  fraud_probability: number;
  reason: string;
}

export async function callGemini(transaction: Transaction): Promise<GeminiFraudResult> {
  // If API key is missing, immediately fallback to rule score
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your_key_here") {
    return { fraud_probability: 0, reason: "ML unavailable (API key missing)" };
  }

  const prompt = `
    Analyze this financial transaction for potential fraud.
    Return valid JSON only, without any markdown formatting or explanations outside JSON.

    Transaction Details:
    - Amount: ${transaction.amount} ${transaction.currency || "INR"}
    - Country: ${transaction.country}
    - Device ID: ${transaction.device_id}
    - User ID: ${transaction.user_id}
    - Timestamp: ${transaction.timestamp}
    - IP: ${transaction.ip || "unknown"}
    - Merchant Category: ${transaction.merchant_category || "general"}

    Return format:
    {
      "fraud_probability": <number between 0.0 and 1.0>,
      "reason": "<concise explanation under 15 words>"
    }
  `;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn(`Gemini API returned status ${response.status}: ${response.statusText}`);
      return { fraud_probability: 0.5, reason: "ML rate limited or unavailable" };
    }

    const data = (await response.json()) as any;
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return { fraud_probability: 0.5, reason: "ML empty response" };
    }

    // Clean any potential markdown code block markers
    const cleanedJson = candidateText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
    const parsed = JSON.parse(cleanedJson);

    return {
      fraud_probability: typeof parsed.fraud_probability === "number" ? Math.max(0, Math.min(1, parsed.fraud_probability)) : 0.5,
      reason: parsed.reason || "AI anomaly evaluation",
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      console.warn("Gemini API request timed out (fallback to rules)");
      return { fraud_probability: 0.5, reason: "ML timed out" };
    }
    console.error("Gemini API call failed:", err);
    return { fraud_probability: 0.5, reason: "ML unavailable" };
  }
}