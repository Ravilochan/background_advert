# PRODUCT REQUIREMENTS DOCUMENT (PRD)

1. Product Name

Background Ad Inserter (BAI)
Subtle AI-powered video background advertising system

⸻

1. Problem Statement

Content creators and advertisers lack a seamless way to insert non-intrusive, context-aware background advertisements into videos without manual editing.

Existing tools:
• Require manual masking/editing
• Do not leverage modern generative AI
• Struggle with consistency across frames

⸻

1. Goal

Build a web-based system that: 1. Accepts a video + advertising asset (image/logo) 2. Automatically identifies safe background regions 3. Lets user select placement timestamps 4. Uses AI to insert the asset consistently across frames 5. Reconstructs and outputs the final edited video

⸻

1. Key Principles
   • ❌ No interaction with main subject (human/object)
   • ✅ Only background placement
   • ✅ Maintain cinematic quality
   • ✅ Subtle, non-intrusive advertising
   • ✅ Consistency across frames

⸻

1. User Flow

Step 1: Upload
• User uploads:
• Video (mp4, mov)
• Asset (png/jpg/logo)

⸻

Step 2: Frame Analysis (AI-assisted)

System: 1. Extract frames from video 2. Analyze frames 3. Identify candidate regions for ad placement

Output:
• Suggested timestamps:
• e.g. 00:03–00:07, 00:10–00:15

⸻

Step 3: Preview (Single Frame)
• Pick representative frame
• Insert asset using generative AI
• Show preview to user

User:
• Accept / Reject
• Adjust placement (optional later)

⸻

Step 4: Full Processing
• Apply transformation to all frames in selected range
• Maintain:
• Position consistency
• Lighting consistency
• Perspective alignment

⸻

Step 5: Video Reconstruction
• Merge frames → video using FFmpeg
• Output downloadable video

⸻

1. System Architecture

High-Level Components

Frontend (React + Vite)
↓
Backend (Node.js + TypeScript)
↓
Processing Pipeline
├── FFmpeg (frame extraction & stitching)
├── Frame Analyzer (AI)
├── Placement Engine
└── Generative AI (Gemini models)

⸻

1. Detailed Technical Design

⸻

7.1 Frontend (React + Vite + TypeScript)

Features:
• Upload UI (video + asset)
• Video player with timeline markers
• Suggested placement highlights
• Preview pane
• Progress tracking

Libraries:
• React
• Vite
• Zustand / Redux (state)
• React Player / HTML5 video

⸻

7.2 Backend (Node.js + TypeScript)

Responsibilities:
• File handling
• Frame extraction
• AI orchestration
• FFmpeg processing

⸻

1. Core Pipeline (IMPORTANT)

⸻

PHASE 1: Frame Extraction

Use FFmpeg:

ffmpeg -i input.mp4 -vf fps=1 frames/frame\_%04d.png

👉 Start with 1 FPS (optimization later)

⸻

PHASE 2: Frame Similarity Reduction

Problem: Too many frames

Solution:
• Hash frames (pHash / dHash)
• Remove duplicates

Output:
• Unique frames only

⸻

PHASE 3: Placement Detection (AI)

For each frame:

Prompt to Vision Model:

Analyze this frame:

- Identify main subject
- Identify background regions safe for placing an object
- Avoid:
  - Human faces
  - Moving objects
  - Foreground

Return:
{
"safe_regions": [
{ "x": 120, "y": 300, "width": 200, "height": 150 }
],
"confidence": 0.92
}

⸻

PHASE 4: Timestamp Aggregation

Group frames into time ranges:

Example:

Frame 1–5 → Safe
Frame 6–20 → Unsafe
Frame 21–40 → Safe

Convert → timestamps

⸻

PHASE 5: Preview Generation

Take 1 frame from selected segment

Prompt to Generative Model:

Insert this logo into the background:

- Maintain realism
- Match lighting and perspective
- Do not overlap subject

Return:
• Edited frame

⸻

PHASE 6: Full Frame Processing

For each frame in selected segment:

Input:
• Original frame
• Asset
• Reference frame (for consistency)

Prompt:

Insert the asset in the SAME position and style as reference.
Maintain:

- Scale
- Lighting
- Perspective

⸻

PHASE 7: Video Reconstruction

ffmpeg -framerate 24 -i frame\_%04d.png -c:v libx264 output.mp4

⸻

1. AI Models Strategy

Models to Use:
• Gemini 2.5 Pro → high-quality generation
• Gemini Flash → fast iteration

⸻

Tasks Split:

Task Model
Frame understanding Vision model
Region detection Vision
Asset insertion Image generation

⸻

1. Data Structures

⸻

Frame Metadata

type FrameAnalysis = {
frameId: number;
timestamp: number;
safeRegions: {
x: number;
y: number;
width: number;
height: number;
}[];
};

⸻

Segment

type Segment = {
start: number;
end: number;
frames: number[];
};

⸻

1. MVP Scope (VERY IMPORTANT)

Start SMALL:

MVP v1:
• Upload video (≤5 sec)
• Extract frames (1 FPS)
• Analyze frames
• Suggest timestamps
• Preview single frame
• Apply to ALL frames (no tracking yet)
• Rebuild video

⸻

Skip for now:
• Motion tracking
• Occlusion handling
• Perspective correction
• Multi-placement

⸻

1. Future Enhancements
   • Object tracking (so asset moves with camera)
   • Depth estimation
   • Occlusion handling (object goes behind subject)
   • Real-time editing
   • Multiple ads
   • A/B testing ads

⸻

1. Performance Considerations

Problem:
• Processing every frame is expensive

Solutions:
• Frame deduplication
• FPS reduction (1 → 5 → 24 later)
• Batch API calls
• Cache results

⸻

1. Risks

Risk Mitigation
AI inconsistency Use reference frame
Cost explosion Reduce frames
Bad placement Human approval step
Flickering Lock position

⸻

1. Suggested Folder Structure

/app
/frontend
/backend

/backend
/services
frameExtractor.ts
frameAnalyzer.ts
aiProcessor.ts
videoBuilder.ts

/pipelines
processVideo.ts

/utils
ffmpeg.ts

⸻

1. Example Pipeline Function

async function processVideo(video, asset) {
const frames = await extractFrames(video);

const uniqueFrames = await deduplicate(frames);

const analysis = await analyzeFrames(uniqueFrames);

const segments = groupSegments(analysis);

const preview = await generatePreview(segments[0], asset);

const editedFrames = await processFrames(segments[0], asset);

const output = await buildVideo(editedFrames);

return output;
}

⸻

1. Key Insight (Your Core Innovation)

What makes your idea strong:

👉 You are NOT doing traditional video editing
👉 You are using LLMs as a frame-by-frame intelligent compositor

That’s fundamentally different.

⸻

1. Final Instructions for AI Coding Tools

When you feed this into Gemini CLI or similar, include:

Goal:
Build a web app that:

- Uploads video + image
- Extracts frames using FFmpeg
- Uses AI to detect safe background regions
- Allows preview of inserted asset
- Applies transformation across frames
- Reconstructs video

Tech:

- Frontend: React + Vite + TypeScript
- Backend: Node.js + TypeScript
- FFmpeg for video processing
- Gemini APIs for vision + generation

Start with MVP:

- 5 second video max
- 1 FPS frame extraction
- Single placement region
- No motion tracking
