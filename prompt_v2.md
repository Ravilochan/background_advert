# PRODUCT REQUIREMENTS DOCUMENT (PRD v2)

⸻

1. Product Name

Background Ad Inserter (BAI) – Optimized Pipeline

⸻

1. Core Idea (Refined)

A system that:

Uses AI only for decision-making, and FFmpeg for execution

⸻

1. Key Innovation (IMPORTANT)

❌ Old approach:
• AI edits every frame

✅ New approach:
• AI analyzes segments
• AI generates one reference frame
• FFmpeg applies transformation across frames

⸻

1. High-Level Pipeline (FINAL)

Video Upload
↓
Scene Detection (FFmpeg)
↓
Segment Creation
↓
Keyframe Extraction
↓
AI Frame Analysis (few frames)
↓
Safe Region Selection
↓
AI Preview Generation (1 frame)
↓
Placement Metadata Extraction
↓
FFmpeg Rendering (bulk)
↓
Final Video Output

⸻

1. Detailed System Flow

⸻

PHASE 1: Scene Detection (NO AI)

Tool:
FFmpeg

ffmpeg -i input.mp4 -vf "select='gt(scene,0.1)'" -vsync vfr frames/out\_%04d.png

⸻

Output:
• Keyframes representing scene changes

⸻

PHASE 2: Segment Creation

Group video into segments:

type Segment = {
startTime: number;
endTime: number;
keyFrame: string;
isStatic: boolean;
};

⸻

Static Detection:

if (frameDiff < threshold) → static

⸻

PHASE 3: AI FRAME ANALYSIS (LIMITED)

⸻

Only run AI on:
• 1 keyframe per segment

⸻

📡 API: /ai/analyze-frame

Prompt (UPDATED)

⸻

SYSTEM PROMPT

You are a computer vision system for video advertising placement.

Your task:
Identify STATIC background regions suitable for subtle advertisement placement.

STRICT RULES:

- Ignore humans, faces, and foreground objects
- Only choose flat/static surfaces (walls, boards, empty areas)
- Avoid moving regions
- Prefer areas that remain stable across frames
- Output must be deterministic

Return ONLY JSON.

⸻

USER PROMPT

Analyze this frame and return:

{
"safeRegions": [
{
"x": number,
"y": number,
"width": number,
"height": number,
"stabilityScore": number,
"confidence": number
}
],
"recommendedRegion": {
"x": number,
"y": number,
"width": number,
"height": number
}
}

⸻

PHASE 4: REGION SELECTION ENGINE

⸻

Logic:

pick region where:
confidence > 0.8
stabilityScore highest
area reasonable

⸻

PHASE 5: AI PREVIEW GENERATION (ONLY ONCE)

⸻

📡 API: /ai/generate-preview

⸻

SYSTEM PROMPT

You are a professional visual compositor.

Insert the given asset into the image naturally.

STRICT RULES:

- Maintain photorealism
- Match lighting and shadows
- Respect perspective of surface
- Keep placement subtle and non-distracting
- Do NOT overlap humans or important objects

Output ONLY the edited image.

⸻

USER PROMPT

Insert the asset into this region:

x: {{x}}, y: {{y}}, width: {{width}}, height: {{height}}

Additionally:

- Match perspective of surface
- Match lighting conditions
- Slightly blend into background
- Do not make it look like a sticker

⸻

🔥 OUTPUT (IMPORTANT)

Also extract:

type PlacementMeta = {
x: number;
y: number;
width: number;
height: number;
opacity: number;
blur: number;
brightness: number;
perspective: {
sx0: number; sy0: number;
sx1: number; sy1: number;
sx2: number; sy2: number;
sx3: number; sy3: number;
};
};

👉 This replaces future AI calls

⸻

PHASE 6: RENDERING ENGINE (NO AI)

⸻

🎯 Decision Logic

if (segment.isStatic) {
use FFmpeg overlay
} else {
limited AI fallback OR skip
}

⸻

FFmpeg Filter Generator

⸻

Example Output

ffmpeg -i input.mp4 -i asset.png -filter_complex "

[1:v]
scale=200:-1,
format=rgba,
colorchannelmixer=aa=0.85,
perspective=...,
eq=brightness=0.02:contrast=0.9,
gblur=sigma=1.2
[ad];

[0:v][ad] overlay=x=100:y=200

" -c:a copy output.mp4

⸻

PHASE 7: SEGMENT-BASED RENDERING

⸻

Instead of full video:

for each segment:
render independently
merge segments

⸻

👉 Parallel + faster

⸻

PHASE 8: FINAL MERGE

⸻

ffmpeg -f concat -i segments.txt -c copy output.mp4

⸻

⚡ PERFORMANCE DESIGN

⸻

1. AI CALL REDUCTION

Stage Calls
Analysis ~10
Preview 1
Rendering 0
Total ~11

⸻

1. LATENCY TARGET

Step Time
Upload ~2s
Analysis ~5s
Preview ~3s
Rendering ~5–10s
Total ~15–20s

⸻

💰 COST DESIGN

⸻

Strategy:
• AI only for:
• Detection
• One preview
• Everything else → FFmpeg

⸻

Result:

👉 ~95–99% cost reduction

⸻

🧠 UPDATED AI PROMPT SYSTEM (FINAL)

⸻

1. Frame Analysis Prompt

Goal:
Detect stable background regions for advertisement placement.

Constraints:

- No humans
- No moving objects
- Only flat surfaces
- Must remain stable across frames

Output JSON only.

⸻

1. Preview Prompt

Goal:
Insert asset realistically into the frame.

Constraints:

- Match lighting
- Match perspective
- Subtle placement
- No sharp edges

⸻

1. (OPTIONAL) Placement Extraction Prompt

Analyze the edited image and extract:

- Bounding box
- Perspective transform
- Opacity level
- Lighting adjustment

Return JSON.

⸻

🧠 ENGINEERING ADDITIONS

⸻

1. Caching Layer

cacheKey = hash(video + asset + region)

⸻

1. Queue System
   • Use BullMQ
   • Parallel segment processing

⸻

1. Storage
   • S3 / GCS for:
   • frames
   • outputs

⸻

🚀 MVP SCOPE (UPDATED)

⸻

MUST HAVE:

✅ Scene detection
✅ Segment processing
✅ 1 AI preview
✅ FFmpeg rendering
✅ Download output
