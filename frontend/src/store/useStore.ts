import { create } from 'zustand';

interface VideoState {
  videoId: string | null;
  assetId: string | null;
  jobId: string | null;
  status: string | null;
  progress: number;
  segments: any[];
  processedVideoUrl: string | null;
  setVideoData: (data: { videoId: string; assetId: string; jobId: string }) => void;
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
  setVideoData: (data) => set({ 
    videoId: data.videoId, 
    assetId: data.assetId, 
    jobId: data.jobId,
    status: 'upload_complete',
    progress: 0,
    processedVideoUrl: null
  }),
  updateStatus: (status, progress) => set({ status, progress }),
  setResult: (result) => set({ 
    status: 'analysis_complete', 
    segments: result.segments,
    processedVideoUrl: result.processedVideoUrl,
    progress: 100
  }),
}));
