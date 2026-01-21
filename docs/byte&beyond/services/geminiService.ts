
import { GoogleGenAI, Type } from "@google/genai";

const API_KEY = process.env.API_KEY || "";

export const getAIInsight = async (content: string): Promise<string> => {
  if (!API_KEY) return "AI insights are unavailable without an API key.";

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following blog content and provide a high-level technical insight or a "takeaway" in one punchy, minimalist sentence: ${content}`,
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    });

    return response.text || "No insight generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to fetch AI insight.";
  }
};
