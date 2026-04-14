import { create } from 'zustand';

interface VideoState {
  videoId: string | null;
  assetId: string | null;
  videoPath: string | null;
  assetPath: string | null;
  jobId: string | null;
  status: string | null;
  progress: number;
  segments: any[];
  processedVideoUrl: string | null;
  videoPreview: string | null;
  assetPreview: string | null;
  setVideoData: (data: { videoId: string; assetId: string; videoPath: string; assetPath: string; jobId: string }) => void;
  setPreviews: (video: string | null, asset: string | null) => void;
  updateStatus: (status: string, progress: number) => void;
  setAnalysisResult: (result: any) => void;
  setRenderResult: (result: any) => void;
  setRenderJobId: (jobId: string) => void;
}

export const useStore = create<VideoState>((set) => ({
  videoId: null,
  assetId: null,
  videoPath: null,
  assetPath: null,
  jobId: null,
  status: null,
  progress: 0,
  segments: [],
  processedVideoUrl: null,
  videoPreview: null,
  assetPreview: null,
  setVideoData: (data) => set({ 
    videoId: data.videoId, 
    assetId: data.assetId,
    videoPath: data.videoPath,
    assetPath: data.assetPath,
    jobId: data.jobId,
    status: 'upload_complete',
    progress: 0,
    processedVideoUrl: null
  }),
  setPreviews: (video, asset) => set({ videoPreview: video, assetPreview: asset }),
  updateStatus: (status, progress) => set({ status, progress }),
  setAnalysisResult: (result) => set({ 
    status: 'analysis_complete', 
    segments: result.segments,
    progress: 100
  }),
  setRenderJobId: (jobId) => set({
    jobId,
    status: 'rendering',
    progress: 0,
    processedVideoUrl: null
  }),
  setRenderResult: (result) => set({
    status: 'completed',
    processedVideoUrl: result.processedVideoUrl,
    progress: 100
  }),
}));
