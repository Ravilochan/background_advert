# Frontend Documentation

React + Vite UI for uploading media, tracking processing progress, and previewing/download processed output videos.

## Features

- Drag-and-drop upload for:
  - source video
  - ad asset image
- Upload trigger to backend API.
- Polling-based job status updates every 2 seconds.
- Processing progress bar and status display.
- Final video preview and download link.
- Segment keyframe preview grid.

## Tech Stack

- React 19 + TypeScript
- Vite
- Zustand (state management)
- Axios (HTTP)
- React Dropzone
- Lucide React (icons)

## Project Structure

- `src/App.tsx` - main upload and polling workflow UI.
- `src/store/useStore.ts` - app state for job, progress, and output.
- `src/App.css` - component-level styling.
- `src/main.tsx` - app bootstrap.

## API Integration

Current API base URL is hardcoded in `src/App.tsx`:

`http://localhost:3001/api`

Used endpoints:

- `POST /upload`
- `GET /status/:jobId`

Static media URLs consumed from backend:

- `http://localhost:3001/uploads/...`
- `http://localhost:3001/temp/...`

## Local Development

```bash
cd frontend
pnpm install
pnpm run dev
```

Default Vite dev URL is typically `http://localhost:5173`.

## Scripts

- `pnpm run dev` - Start Vite dev server.
- `pnpm run build` - Type-check and produce production build.
- `pnpm run preview` - Preview production build locally.
- `pnpm run lint` - Run ESLint.

## Notes

- Backend must be running on port `3001` for the default setup.
- Upload button is enabled only when both required files are selected.
