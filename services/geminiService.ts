
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
      description: "Detailed disposal instructions and local Malaysian recycling rules (e.g., which bin color to use).",
    },
  },
  required: ["material", "recyclable", "instruction"],
};

export async function analyzeWasteImage(base64Image: string): Promise<WasteAnalysis> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const prompt = `
    Analyze this waste item for a user in Malaysia. 
    Identify the exact material.
    Determine if it is recyclable according to the Malaysian Separation at Source (SAS) policy.
    Provide clear instructions on how to dispose of it, specifically mentioning the Malaysian bin colors:
    - Blue for Paper
    - Brown for Glass
    - Orange for Plastics/Metals
    - Green/Black for Residual waste
    
    Return the response in a structured JSON format.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image.split(",")[1],
              },
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: MATERIAL_ANALYSIS_SCHEMA,
      },
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return result as WasteAnalysis;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Failed to analyze the image. Please try again.");
  }
}
