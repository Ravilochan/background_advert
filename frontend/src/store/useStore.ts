import { create } from 'zustand';

interface VideoState {
  videoId: string | null;
  assetId: string | null;
  jobId: string | null;
  status: string | null;
  progress: number;
  segments: any[];
  processedVideoUrl: string | null;
  videoPreview: string | null;
  assetPreview: string | null;
  setVideoData: (data: { videoId: string; assetId: string; jobId: string }) => void;
  setPreviews: (video: string | null, asset: string | null) => void;
  updateStatus: (status: string, progress: number) => void;
  setResult: (result: any) => void;
}

export const useStore = create<VideoState>((set) => ({
  videoId: null,
  assetId: null,
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
    jobId: data.jobId,
    status: 'upload_complete',
    progress: 0,
    processedVideoUrl: null
  }),
  setPreviews: (video, asset) => set({ videoPreview: video, assetPreview: asset }),
  updateStatus: (status, progress) => set({ status, progress }),
  setResult: (result) => set({ 
    status: 'analysis_complete', 
    segments: result.segments,
    processedVideoUrl: result.processedVideoUrl,
    progress: 100
  }),
}));
