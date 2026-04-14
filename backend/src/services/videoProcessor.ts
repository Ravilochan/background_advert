import { Queue, Worker, Job } from 'bullmq';
import path from 'path';
import fs from 'fs';
import redisConnection from '../utils/redis.js';
import { extractKeyframesAndDetectScenes, renderSegment } from '../utils/ffmpeg.js';
import { analyzeFrame } from './ai.js';

export const videoQueue = new Queue('video-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: {
      age: 3600, // keep up to 1 hour
      count: 100, // keep up to 100 jobs
    },
    removeOnFail: {
      age: 24 * 3600, // keep up to 24 hours
    },
  },
});

interface VideoJobData {
  videoId: string;
  assetId: string;
  videoPath: string;
  assetPath: string;
}

export const videoWorker = new Worker(
  'video-processing',
  async (job: Job<VideoJobData>) => {
    const { videoId, videoPath, assetPath } = job.data;
    const outputDir = path.join(process.cwd(), 'temp', videoId);
    const finalOutputPath = path.join(process.cwd(), 'uploads', `processed_${videoId}`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    try {
      await job.updateProgress(10);
      
      // Phase 1: Scene Detection & Keyframe Extraction
      const segments = await extractKeyframesAndDetectScenes(videoPath, outputDir);
      await job.updateProgress(30);

      // Phase 2: AI Analysis (1 frame per segment)
      const analyzedSegments = [];
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        if (segment) {
          const analysis = await analyzeFrame(segment.keyframePath);
          analyzedSegments.push({
            ...segment,
            analysis,
          });
        }
        await job.updateProgress(30 + Math.floor(((i + 1) / segments.length) * 30));
      }

      // Phase 4: Rendering
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
            region: seg.analysis.recommendedRegion
          });
          currentVideoPath = tempOut;
        }
        await job.updateProgress(60 + Math.floor(((i + 1) / analyzedSegments.length) * 30));
      }

      // Final move to uploads
      fs.copyFileSync(currentVideoPath, finalOutputPath);

      await job.updateProgress(100);
      
      return {
        segments: analyzedSegments,
        processedVideoUrl: `/uploads/processed_${videoId}`,
        message: 'Processing complete.',
      };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);
