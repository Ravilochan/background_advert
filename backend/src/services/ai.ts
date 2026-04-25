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

export interface RenderOptions {
  opacity: number;
  blur: number;
  brightness: number;
}

export interface AnalysisResult {
  safeRegions: SafeRegion[];
  recommendedRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  renderOptions: RenderOptions;
  promptUsed?: string;
}

export const DEFAULT_ANALYSIS_PROMPT = `
Analyze this frame and identify STATIC background regions suitable for subtle advertisement placement.

You must also recommend visual characteristics (opacity, blur, brightness) to make the asset blend naturally into the scene, matching the local lighting and depth.

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
  "recommendedRegion": { "x": number, "y": number, "width": number, "height": number },
  "renderOptions": {
    "opacity": number (0.1 to 1.0, e.g. 0.9 for slight transparency),
    "blur": number (0 to 10, e.g. 0 for sharp, 2 for slight background blur),
    "brightness": number (-1.0 to 1.0, e.g. 0 for no change, -0.1 for darker)
  }
}
All coordinates and dimensions should be in pixels relative to the image size.
`;

export const analyzeFrame = async (imagePath: string, customPrompt?: string): Promise<AnalysisResult> => {
  // Using gemini-3-flash-preview as per 2026 documentation for fast visual reasoning
  const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

  const promptToUse = customPrompt || DEFAULT_ANALYSIS_PROMPT;

  const imageData = fs.readFileSync(imagePath);
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/jpeg",
      },
    },
    { text: promptToUse },
  ]);

  const response = result.response;
  const text = response.text();
  
  // Extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("AI Response:", text);
    throw new Error("Failed to parse AI response as JSON");
  }

  const analysis = JSON.parse(jsonMatch[0]) as AnalysisResult;
  analysis.promptUsed = promptToUse;
  
  // Ensure default fallback values for renderOptions if AI omits them
  if (!analysis.renderOptions) {
    analysis.renderOptions = { opacity: 0.9, blur: 0, brightness: 0 };
  }

  return analysis;
};

export const generatePreview = async (
  framePath: string,
  assetPath: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<string> => {
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
