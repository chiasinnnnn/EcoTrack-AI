
import { GoogleGenerativeAI } from "@google/generative-ai";
import { WasteAnalysis } from "../types";

export class GeminiService {
  private static MATERIAL_ANALYSIS_SCHEMA = {
    type: "object",
    properties: {
      material: {
        type: "string",
        description: "The name/type of the material identified (e.g., PET 1 Plastic, Aluminum, Cardboard).",
      },
      recyclable: {
        type: "boolean",
        description: "Whether the item is recyclable according to Malaysian guidelines.",
      },
      instruction: {
        type: "string",
        description: "Detailed disposal instructions strictly mentioning Malaysian SAS bin colors: Blue (Paper), Brown (Glass), Orange (Plastic/Metal).",
      },
      hazard_level: {
        type: "string",
        description: "Risk level (Low, Medium, High) for disposal",
      },
    },
    required: ["material", "recyclable", "instruction", "hazard_level"],
  };

  static async analyzeWasteImage(base64Image: string): Promise<WasteAnalysis> {
    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please ensure it is set in your environment.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: this.MATERIAL_ANALYSIS_SCHEMA as any,
      },
    });
    
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
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(",")[1],
          },
        },
      ]);

      const text = result.response.text();
      if (!text) {
        throw new Error("No response text received from the model.");
      }
      
      const data = JSON.parse(text);
      return data as WasteAnalysis;
    } catch (error) {
      console.error("Error analyzing image:", error);
      throw new Error("Failed to analyze the image. Please try again.");
    }
  }
}

export const analyzeWasteImage = GeminiService.analyzeWasteImage;

