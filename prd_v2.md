Background Ad Inserter (BAI) — Production PRD + AI Prompt Spec (Optimized)

Overview

Build a web application that inserts subtle, realistic advertisements into video backgrounds using a hybrid pipeline:
• AI for decision-making (where & how)
• FFmpeg for execution (fast, scalable rendering)

This system is optimized for:
• Minimal AI cost
• Low latency
• High visual realism
• Segment-based processing

⸻

Core Principles 1. Never process every frame with AI 2. Use scene detection to reduce workload 3. Use AI once per segment 4. Use FFmpeg for bulk rendering 5. Maintain visual consistency via reference frame

⸻

High-Level Pipeline 1. Upload video + asset 2. Detect scene changes (FFmpeg) 3. Create segments 4. Extract keyframes 5. Run AI analysis (1 frame per segment) 6. Select best placement region 7. Generate preview (1 AI call) 8. Extract placement metadata 9. Apply FFmpeg filters to entire segment 10. Merge segments into final video

⸻

Phase 1: Scene Detection

Use FFmpeg to extract keyframes:

ffmpeg -i input.mp4 -vf “select=‘gt(scene,0.1)’” -vsync vfr frames/out\_%04d.png

Output:
• Scene-based keyframes

⸻

Phase 2: Segment Creation

Group frames into segments:

type Segment = {
startTime: number;
endTime: number;
keyFrame: string;
isStatic: boolean;
};

Static detection:

if (frameDifference < threshold) → isStatic = true

⸻

Phase 3: AI Frame Analysis

Run only on keyframes.

API: POST /ai/analyze-frame

Request:
{
“frameId”: “string”,
“imageBase64”: “string”
}

Response:
{
“safeRegions”: [
{
“x”: number,
“y”: number,
“width”: number,
“height”: number,
“stabilityScore”: number,
“confidence”: number
}
],
“recommendedRegion”: {
“x”: number,
“y”: number,
“width”: number,
“height”: number
}
}

⸻

Prompt: Frame Analysis

SYSTEM:
You are a computer vision system for video advertising placement.

Your task:
Identify STATIC background regions suitable for subtle advertisement placement.

STRICT RULES:
• Ignore humans, faces, and foreground objects
• Only choose flat/static surfaces (walls, boards, empty areas)
• Avoid moving regions
• Prefer stable regions across frames
• Output must be deterministic

Return ONLY JSON.

USER:
Analyze this frame and return:

{
“safeRegions”: [
{
“x”: number,
“y”: number,
“width”: number,
“height”: number,
“stabilityScore”: number,
“confidence”: number
}
],
“recommendedRegion”: {
“x”: number,
“y”: number,
“width”: number,
“height”: number
}
}

⸻

Phase 4: Region Selection

Select best region:
• confidence > 0.8
• highest stabilityScore
• reasonable size

⸻

Phase 5: AI Preview Generation

API: POST /ai/generate-preview

Request:
{
“frameBase64”: “string”,
“assetBase64”: “string”,
“region”: { x, y, width, height }
}

Response:
{
“imageBase64”: “string”,
“placementMeta”: {
“x”: number,
“y”: number,
“width”: number,
“height”: number,
“opacity”: number,
“blur”: number,
“brightness”: number,
“perspective”: {
“sx0”: number, “sy0”: number,
“sx1”: number, “sy1”: number,
“sx2”: number, “sy2”: number,
“sx3”: number, “sy3”: number
}
}
}

⸻

Prompt: Preview Generation

SYSTEM:
You are a professional visual compositor.

Insert the given asset into the image naturally.

STRICT RULES:
• Maintain photorealism
• Match lighting and shadows
• Respect surface perspective
• Keep placement subtle
• Do not overlap humans

Output ONLY the edited image.

USER:
Insert the asset into this region:

x: {{x}}, y: {{y}}, width: {{width}}, height: {{height}}

Constraints:
• Match perspective
• Match lighting
• Slight blur for realism
• Blend naturally into background

⸻

Phase 6: Rendering Engine (FFmpeg)

Decision:

if (segment.isStatic):
use FFmpeg overlay
else:
fallback or skip

⸻

FFmpeg Filter Template

ffmpeg -i input.mp4 -i asset.png -filter_complex “

[1:v]
scale=200:-1,
format=rgba,
colorchannelmixer=aa=0.85,
perspective=
x0=0:y0=0:
x1=W:y1=0:
x2=0:y2=H:
x3=W:y3=H:
sx0=100:sy0=200:
sx1=300:sy1=180:
sx2=120:sy2=400:
sx3=320:sy3=380,
eq=brightness=0.02:contrast=0.9:saturation=0.95,
gblur=sigma=1.2
[ad];

[0:v][ad] overlay=x=100:y=200

“ -c:a copy output.mp4

⸻

Phase 7: Segment-Based Rendering

Process segments independently:

for each segment:
render segment
merge all segments

⸻

Phase 8: Merge Output

ffmpeg -f concat -i segments.txt -c copy output.mp4

⸻

Performance Strategy
• Scene detection reduces frames by ~90%
• AI calls reduced to ~10 per video
• FFmpeg handles bulk rendering
• Parallel segment processing

⸻

Cost Optimization
• AI only used for:
• Frame analysis
• Single preview
• No per-frame AI generation

⸻

Latency Target

Total processing time: ~15–20 seconds (short video)

⸻

Caching

cacheKey = hash(video + asset + region)

Cache:
• frame analysis
• preview
• final outputs

MVP Scope

Include:
• Video upload
• Scene detection
• Segment processing
• AI preview
• FFmpeg rendering
• Download output
