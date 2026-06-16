import { Transaction } from "../types";

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

export async function callGemini(transaction: Transaction): Promise<{
  fraud_probability: number;
  reason: string;
}> {
  const prompt = `
    Analyze this bank transaction for fraud.
    Return JSON only, no extra text.

    Amount: ${transaction.amount}
    Country: ${transaction.country}
    Device ID: ${transaction.device_id}
    Hour: ${new Date(transaction.timestamp).getHours()}
    User ID: ${transaction.user_id}

    Return exactly:
    {
      "fraud_probability": 0.0 to 1.0,
      "reason": "short reason here"
    }
  `;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return JSON.parse(text);

  } catch (err) {
    console.error("Gemini API failed:", err);
    return { fraud_probability: 0.5, reason: "ML unavailable" };
  }
}