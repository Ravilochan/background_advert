import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface SafeRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  stabilityScore: number;
  confidence: number;
}

export interface AnalysisResult {
  safeRegions: SafeRegion[];
  recommendedRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const analyzeFrame = async (imagePath: string): Promise<AnalysisResult> => {
  // Using gemini-3-flash-preview as per 2026 documentation for fast visual reasoning
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const prompt = `
    Analyze this frame and identify STATIC background regions suitable for subtle advertisement placement.
    
    STRICT RULES:
    - Ignore humans, faces, and foreground objects
    - Only choose flat/static surfaces (walls, boards, empty areas)
    - Avoid moving regions
    - Prefer stable regions across frames
    
    Return ONLY JSON in the following format:
    {
      "safeRegions": [
        { "x": number, "y": number, "width": number, "height": number, "stabilityScore": number, "confidence": number }
      ],
      "recommendedRegion": { "x": number, "y": number, "width": number, "height": number }
    }
    All coordinates and dimensions should be in pixels relative to the image size.
  `;

  const imageData = fs.readFileSync(imagePath);
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    { text: prompt },
  ]);

  const response = result.response;
  const text = response.text();
  
  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("AI Response:", text);
    throw new Error("Failed to parse AI response as JSON");
  }

  return JSON.parse(jsonMatch[0]) as AnalysisResult;
};

export const generatePreview = async (
  framePath: string,
  assetPath: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<string> => {
  // Using gemini-3-pro-image-preview for professional asset production/generation as per 2026 docs
  const model = genAI.getGenerativeModel({ model: "gemini-3-pro-image-preview" });

  const prompt = `
    Insert the given asset into the background of the image naturally.
    Target Region: x=${region.x}, y=${region.y}, width=${region.width}, height=${region.height}
    
    STRICT RULES:
    - Maintain photorealism
    - Match lighting, shadows, and surface texture
    - Respect perspective of the background surface
    - Do not overlap humans or foreground objects
    
    Output the edited image.
  `;

  const frameData = fs.readFileSync(framePath);
  const assetData = fs.readFileSync(assetPath);

  const result = await model.generateContent([
    {
      inlineData: {
        data: frameData.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    {
      inlineData: {
        data: assetData.toString("base64"),
        mimeType: "image/png",
      },
    },
    { text: prompt },
  ]);

  const response = result.response;
  return response.text();
};
