import { Queue, Worker, Job } from 'bullmq';
import path from 'path';
import fs from 'fs';
import redisConnection from '../utils/redis.js';
import { extractKeyframesAndDetectScenes, renderSegment, renderPreviewFrame } from '../utils/ffmpeg.js';
import { analyzeFrame } from './ai.js';

export const videoQueue = new Queue('video-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600,
      count: 100,
    },
    removeOnFail: {
      age: 24 * 3600,
    },
  },
});

interface AnalysisJobData {
  type: 'analyze';
  videoId: string;
  videoPath: string;
  assetPath: string;
}

interface RenderJobData {
  type: 'render';
  videoId: string;
  videoPath: string;
  assetPath: string;
  analyzedSegments: any[];
}

export const videoWorker = new Worker(
  'video-processing',
  async (job: Job<AnalysisJobData | RenderJobData>) => {
    const { videoId, videoPath } = job.data;
    const outputDir = path.join(process.cwd(), 'temp', videoId);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (job.data.type === 'analyze') {
      const { assetPath } = job.data;
      try {
        await job.updateProgress(10);
        // Phase 1: Scene Detection & Keyframe Extraction
        const segments = await extractKeyframesAndDetectScenes(videoPath, outputDir);
        await job.updateProgress(30);

        // Phase 2: AI Analysis
        const analyzedSegments = [];
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          if (segment) {
            const analysis = await analyzeFrame(segment.keyframePath);
            
            // Generate preview frame if a region was recommended
            let previewFramePath = null;
            if (analysis.recommendedRegion) {
              const previewName = `preview_${i}.jpg`;
              const fullPreviewPath = path.join(outputDir, previewName);
              await renderPreviewFrame(
                segment.keyframePath,
                assetPath,
                fullPreviewPath,
                analysis.recommendedRegion,
                analysis.renderOptions
              );
              previewFramePath = fullPreviewPath;
            }

            analyzedSegments.push({
              ...segment,
              analysis,
              previewFramePath,
            });
          }
          await job.updateProgress(30 + Math.floor(((i + 1) / segments.length) * 70));
        }

        return {
          type: 'analysis_complete',
          segments: analyzedSegments,
          videoId,
          videoPath,
          assetPath,
        };
      } catch (error) {
        console.error(`Analysis Job ${job.id} failed:`, error);
        throw error;
      }
    } else if (job.data.type === 'render') {
      const { assetPath, analyzedSegments } = job.data;
      const finalOutputPath = path.join(process.cwd(), 'uploads', `processed_${videoId}`);

      try {
        await job.updateProgress(10);
        let currentVideoPath = videoPath;
        
        for (let i = 0; i < analyzedSegments.length; i++) {
          const seg = analyzedSegments[i];
          if (seg && seg.analysis && seg.analysis.recommendedRegion) {
            const tempOut = path.join(outputDir, `rendered_${i}.mp4`);
            await renderSegment({
              videoPath: currentVideoPath,
              assetPath,
              outputPath: tempOut,
              startTime: seg.startTime,
              endTime: seg.endTime,
              region: seg.analysis.recommendedRegion,
              options: seg.analysis.renderOptions
            });
            currentVideoPath = tempOut;
          }
          await job.updateProgress(10 + Math.floor(((i + 1) / analyzedSegments.length) * 90));
        }

        fs.copyFileSync(currentVideoPath, finalOutputPath);
        return {
          type: 'render_complete',
          processedVideoUrl: `/uploads/processed_${videoId}`,
        };
      } catch (error) {
        console.error(`Render Job ${job.id} failed:`, error);
        throw error;
      }
    }
  },
  { connection: redisConnection }
);
