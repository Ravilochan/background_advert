# Backend Documentation

Express + BullMQ service for video upload and AI-assisted background ad insertion.

## Responsibilities

- Accepts uploads (`video` + `asset`) via multipart API.
- Stores incoming files in `uploads/`.
- Enqueues processing jobs in BullMQ.
- Runs worker pipeline for scene detection, AI analysis, and rendering.
- Exposes status and static file endpoints.

## Runtime Architecture

- `src/index.ts`
  - Initializes Express app, middleware, routes, and static file serving.
  - Imports worker module to start processing worker in the same process.
- `src/routes/upload.ts`
  - Handles upload and status routes.
  - Uses `multer` disk storage with destination `process.cwd()/uploads`.
- `src/services/videoProcessor.ts`
  - Defines queue and worker.
  - Processing stages:
    1. Keyframe extraction + scene segmentation (`extractKeyframesAndDetectScenes`)
    2. Gemini frame analysis (`analyzeFrame`)
    3. Segment rendering with ad overlay (`renderSegment`)
    4. Final copy to `uploads/processed_<videoId>`
- `src/utils/ffmpeg.ts`
  - FFmpeg and FFprobe orchestration.
- `src/services/ai.ts`
  - Gemini model integration and JSON response parsing.
- `src/utils/redis.ts`
  - Redis client for BullMQ.

## Processing Flow

1. `POST /api/upload` receives and validates files.
2. Files are persisted in `backend/uploads`.
3. Queue job `process-video` is created with file paths.
4. Worker creates `backend/temp/<videoId>` workspace.
5. FFmpeg extracts scene keyframes and segment timestamps.
6. Gemini recommends a safe ad placement region per segment keyframe.
7. FFmpeg overlays the ad in segment windows.
8. Final video is saved to `backend/uploads/processed_<videoId>`.
9. `GET /api/status/:jobId` returns progress and final output URL.

## Endpoints

### `POST /api/upload`

Multipart form-data fields:

- `video` (required, max 1, up to 50 MB)
- `asset` (required, max 1, up to 50 MB by global multer limit)

Response includes:

- `jobId`
- uploaded `video` metadata
- uploaded `asset` metadata

### `GET /api/status/:jobId`

Returns:

- `status` (e.g., waiting, active, completed, failed)
- `progress` (0-100)
- `result` (on completion, includes `segments` and `processedVideoUrl`)

### `GET /health`

Basic health response.

## Configuration

Create `backend/.env` (or root `.env`) with:

```env
PORT=3001
GEMINI_API_KEY=your_api_key
REDIS_URL=redis://localhost:6379
```

## Scripts

- `pnpm run dev` - Start backend in watch mode (`tsx watch src/index.ts`)
- `pnpm run build` - Compile TypeScript to `dist/`
- `pnpm run start` - Run compiled output (`node dist/index.js`)

## Dependencies and External Services

- Redis: queue backend for BullMQ.
- FFmpeg/FFprobe: media segmentation and rendering.
- Gemini API (`@google/generative-ai`): safe-region inference.

## Runtime Data

- `uploads/` - uploaded files + processed outputs.
- `temp/` - keyframes and temporary rendered segments.

Both are ignored in git by root `.gitignore`.

## Operational Notes

- Queue cleanup is configured with `removeOnComplete` and `removeOnFail`.
- Worker currently runs in the same process as API server for local simplicity.
- If scaling, separate API and worker into distinct processes using the same Redis.
