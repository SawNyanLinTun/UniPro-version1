
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getInternshipRecommendations = async (userPrompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `User is looking for internships in Thailand. 
      Context: User search query is "${userPrompt}".
      Task: Provide a list of recommended job categories, key skills to focus on, and a encouraging brief advice for a student in Thailand.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendedCategories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "List of categories like Engineering, Business, etc."
            },
            keySkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Technical or soft skills."
            },
            advice: {
              type: Type.STRING,
              description: "Brief career advice for the student."
            }
          },
          required: ["recommendedCategories", "keySkills", "advice"]
        }
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
};
