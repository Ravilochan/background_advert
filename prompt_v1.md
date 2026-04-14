# AI SYSTEM DESIGN OVERVIEW

You are building a multi-stage AI pipeline, not just “call a model”.

Key principle:

👉 Separate reasoning, detection, and generation

⸻

Pipeline (final form)

[Frame]
↓
[Vision Analysis API]
↓
[Placement Decision Engine]
↓
[Preview Generation API]
↓
[Batch Frame Generation API]
↓
[Post-processing + FFmpeg]

⸻

🧩 2. PROMPT DESIGN PRINCIPLES

DO:
• Use structured JSON outputs
• Force deterministic outputs
• Use reference-based consistency

DON’T:
• Allow free-text responses
• Let model “decide creatively” in production stages

⸻

🧠 3. AI SERVICE 1 — FRAME ANALYSIS

⸻

🎯 Goal

Detect safe background regions for ad placement.

⸻

📡 API CONTRACT

POST /ai/analyze-frame

type AnalyzeFrameRequest = {
frameId: string;
imageBase64: string;
};

type AnalyzeFrameResponse = {
success: boolean;
data: {
safeRegions: {
x: number;
y: number;
width: number;
height: number;
confidence: number;
}[];
primarySubject: {
x: number;
y: number;
width: number;
height: number;
};
sceneType: "indoor" | "outdoor" | "studio" | "unknown";
};
};

⸻

🧾 PROMPT (VISION MODEL)

SYSTEM PROMPT

You are a computer vision system for video editing.

Your task:
Identify SAFE background regions where an advertisement image can be placed.

STRICT RULES:

- DO NOT include humans or moving objects
- DO NOT overlap primary subject
- ONLY select flat/static surfaces (walls, billboards, empty space)
- Prefer visually subtle placement areas

Return ONLY valid JSON.

⸻

USER PROMPT

Analyze this frame and return:

1. Primary subject bounding box
2. Safe placement regions

Return format:
{
"primarySubject": { "x": number, "y": number, "width": number, "height": number },
"safeRegions": [
{ "x": number, "y": number, "width": number, "height": number, "confidence": number }
],
"sceneType": "indoor" | "outdoor" | "studio" | "unknown"
}

⸻

⚠️ VALIDATION (MANDATORY)

After response:
• Ensure all coordinates are within image bounds
• Reject if:
• safeRegions empty
• confidence < threshold (0.7)

⸻

🧠 4. AI SERVICE 2 — PREVIEW GENERATION

⸻

🎯 Goal

Generate ONE reference frame with ad inserted.

⸻

📡 API CONTRACT

POST /ai/generate-preview

type GeneratePreviewRequest = {
frameBase64: string;
assetBase64: string;
region: {
x: number;
y: number;
width: number;
height: number;
};
};

type GeneratePreviewResponse = {
success: boolean;
data: {
imageBase64: string;
placementMeta: {
scale: number;
rotation: number;
lighting: string;
};
};
};

⸻

🧾 PROMPT (IMAGE GENERATION MODEL)

SYSTEM PROMPT

You are an expert visual compositor.

Insert the provided asset into the image naturally.

STRICT RULES:

- Maintain photorealism
- Match lighting and shadows
- Do NOT overlap people
- Keep placement subtle
- Blend with environment

⸻

USER PROMPT

Insert the asset into the specified region.

Region:
x: {{x}}, y: {{y}}, width: {{width}}, height: {{height}}

Constraints:

- Fit asset inside region
- Preserve aspect ratio
- Match perspective of surface
- Match lighting conditions

Output: Edited image only.

⸻

🧠 KEY OUTPUT

👉 This becomes your REFERENCE FRAME

⸻

🧠 5. AI SERVICE 3 — CONSISTENT FRAME GENERATION

⸻

🎯 Goal

Apply same transformation across all frames

⸻

📡 API CONTRACT

POST /ai/process-frame

type ProcessFrameRequest = {
frameBase64: string;
assetBase64: string;
referenceFrameBase64: string;
placementMeta: {
x: number;
y: number;
width: number;
height: number;
scale: number;
rotation: number;
};
};

type ProcessFrameResponse = {
success: boolean;
data: {
imageBase64: string;
};
};

⸻

🧾 PROMPT

SYSTEM PROMPT

You are a deterministic image editor.

Your job:
Apply the SAME transformation from the reference image to this frame.

STRICT RULES:

- DO NOT change placement
- DO NOT reimagine position
- Maintain consistency across frames
- Keep lighting coherent with scene

⸻

USER PROMPT

Use the reference image as ground truth.

Insert the asset in EXACTLY the same position and style.

Constraints:

- Same size
- Same alignment
- Same perspective
- Same blending style

Output only the edited frame.

⸻

🔥 CRITICAL INSIGHT

👉 This prevents:
• Flickering
• Position drift
• Inconsistent lighting

⸻

⚙️ 6. ORCHESTRATION API (MAIN PIPELINE)

⸻

📡 POST /video/process

type ProcessVideoRequest = {
videoUrl: string;
assetUrl: string;
};

type ProcessVideoResponse = {
jobId: string;
};

⸻

📡 GET /video/status/:jobId

type StatusResponse = {
status: "processing" | "completed" | "failed";
progress: number;
outputUrl?: string;
};

⸻

🧠 7. PIPELINE ORCHESTRATION LOGIC

⸻

Step-by-step

async function pipeline(video, asset) {
// 1. Extract frames
const frames = await extractFrames(video);

// 2. Analyze frames
const analysis = await Promise.all(
frames.map(f => analyzeFrame(f))
);

// 3. Pick best region
const bestRegion = selectBestRegion(analysis);

// 4. Generate preview
const preview = await generatePreview(
frames[0],
asset,
bestRegion
);

// 5. Process all frames
const processedFrames = await batchProcessFrames(
frames,
asset,
preview
);

// 6. Rebuild video
return buildVideo(processedFrames);
}

⸻

⚡ 8. PERFORMANCE OPTIMIZATION (PRODUCTION CRITICAL)

⸻

1. Frame Sampling

Instead of 24 FPS:

const FPS = 1; // MVP

⸻

1. Frame Deduplication

if (hash(frameA) === hash(frameB)) skip;

⸻

1. Batch API Calls

await Promise.allSettled(frames.map(processFrame));

⸻

1. Caching

cacheKey = hash(frame + asset + region);

⸻

💰 9. COST CONTROL STRATEGY

⸻

Tiered Model Usage

Stage Model
Analysis Cheap vision model
Preview High-quality model
Bulk frames Fast model

⸻

Smart Skip Logic
• If frames identical → reuse output
• If scene unchanged → reuse placement

⸻

🧪 10. FAILURE HANDLING

⸻

Retry Strategy

retry 3 times with exponential backoff

⸻

Fallback
• If AI fails:
• Use simple overlay (FFmpeg)

⸻

🔐 11. SAFETY & VALIDATION

⸻

    • Validate uploaded assets
    • Limit video duration (MVP: 5–10 sec)
    • Sanitize prompts (no injection)
