# Background Ad Inserter

AI-powered virtual product placement for videos.

This project takes an input video and an ad creative image, detects scene-safe regions with Gemini, and renders a processed output video with subtle background ad insertion.

## Project Structure

- `frontend/` - React + Vite UI for upload, status polling, and result preview/download.
- `backend/` - Express API + BullMQ worker pipeline for upload, analysis, and rendering.
- `backend/uploads/` - Runtime storage for uploaded files and final processed videos (git-ignored).
- `backend/temp/` - Runtime intermediate artifacts like extracted keyframes and intermediate renders (git-ignored).

## How It Works

1. User uploads a video and ad asset from the frontend.
2. Backend stores files in `backend/uploads/`.
3. A BullMQ job starts video processing.
4. FFmpeg detects scenes and extracts keyframes.
5. Gemini analyzes keyframes and recommends safe ad regions.
6. FFmpeg overlays the ad into each analyzed segment.
7. Backend returns a processed video URL and segment metadata.
8. Frontend polls job status and shows preview/download when complete.

## Prerequisites

- Node.js 20+
- pnpm 10+
- Redis running locally (default: `redis://localhost:6379`)
- FFmpeg and FFprobe installed and available on your `PATH`
- Gemini API key

## Environment Variables

Copy `.env.example` to `.env` at the repository root (and/or `backend/.env`) and set:

- `PORT` - Backend API port (default `3001`)
- `GEMINI_API_KEY` - Gemini API key used for keyframe analysis
- `REDIS_URL` - Redis connection URL

## Run Locally

Open two terminals:

1) Start backend:

```bash
cd backend
pnpm install
pnpm run dev
```

1) Start frontend:

```bash
cd frontend
pnpm install
pnpm run dev
```

Then open the Vite URL shown in terminal (usually `http://localhost:5173`).

## API Summary

- `POST /api/upload` - Upload `video` and `asset` as multipart form data.
- `GET /api/status/:jobId` - Poll job status, progress, and result.
- `GET /uploads/:file` - Access uploaded/processed videos.
- `GET /temp/:jobId/:file` - Access generated keyframes for previews.
- `GET /health` - Health check.

For backend details, see `backend/README.md`.

## Notes

- Uploaded and generated media are intentionally not committed.
- Current frontend API base URL is hardcoded to `http://localhost:3001/api`.
- Worker processing is asynchronous, so upload returns quickly with a job ID.

## Troubleshooting

- `ECONNREFUSED 127.0.0.1:6379`: Redis is not running.
- `ffmpeg: command not found`: Install FFmpeg/FFprobe and re-open terminal.
- Gemini authentication errors: verify `GEMINI_API_KEY`.
- No progress updates: ensure backend process includes worker initialization (`src/services/videoProcessor.ts` import in `src/index.ts`).
