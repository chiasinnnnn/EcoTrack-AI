
import { GoogleGenAI, Type } from "@google/genai";
import { WasteAnalysis } from "../types";

const MATERIAL_ANALYSIS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    material: {
      type: Type.STRING,
      description: "The name/type of the material identified (e.g., PET 1 Plastic, Aluminum, Cardboard).",
    },
    recyclable: {
      type: Type.BOOLEAN,
      description: "Whether the item is recyclable according to Malaysian guidelines.",
    },
    instruction: {
      type: Type.STRING,
      description: "Detailed disposal instructions strictly mentioning Malaysian SAS bin colors: Blue (Paper), Brown (Glass), Orange (Plastic/Metal).",
    },
    hazard_level: {
      type: Type.STRING,
      description: "Risk level (Low, Medium, High) for disposal",
    },
  },
  required: ["material", "recyclable", "instruction", "hazard_level"],
};

export class GeminiService {
  static async analyzeWasteImage(base64Image: string): Promise<WasteAnalysis> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not configured. Please ensure it is set in your environment.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Analyze this waste item for a user in Malaysia. 
      Identify the exact material.
      Determine if it is recyclable according to the Malaysian Separation at Source (SAS) policy.
      Assess the hazard level (Low, Medium, High).
      Provide clear instructions on how to dispose of it, strictly enforcing the Malaysian SAS bin colors:
      - Blue for Paper
      - Brown for Glass
      - Orange for Plastics/Metals
      - Green/Black for Residual waste
      
      Return the response in a structured JSON format.
    `;

    try {
      const [header, base64Data] = base64Image.split(",");
      const mimeType = header.split(";")[0].split(":")[1] || "image/jpeg";

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: MATERIAL_ANALYSIS_SCHEMA,
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("No response text received from the model.");
      }
      
      const analysisResult = JSON.parse(text);
      return analysisResult as WasteAnalysis;
    } catch (error: any) {
      console.error("Gemini API Call Error:", error);
      throw new Error(`Failed to analyze the image: ${error.message || 'Unknown error'}`);
    }
  }
}

export const analyzeWasteImage = GeminiService.analyzeWasteImage;

