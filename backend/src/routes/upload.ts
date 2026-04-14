import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

import { videoQueue } from '../services/videoProcessor.js';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  },
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

router.post('/upload', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'asset', maxCount: 1 }
]), async (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  
  if (!files || !files.video || !files.asset || !files.video[0] || !files.asset[0]) {
    return res.status(400).json({ error: 'Both video and asset are required' });
  }

  const videoFile = files.video[0];
  const assetFile = files.asset[0];

  const job = await videoQueue.add('analyze-video', {
    type: 'analyze',
    videoId: videoFile.filename,
    videoPath: videoFile.path,
    assetPath: assetFile.path,
  });

  res.json({
    message: 'Files uploaded successfully. Analysis started.',
    jobId: job.id,
    video: {
      id: videoFile.filename,
      path: videoFile.path,
      originalName: videoFile.originalname,
    },
    asset: {
      id: assetFile.filename,
      path: assetFile.path,
      originalName: assetFile.originalname,
    }
  });
});

router.post('/confirm-render', async (req, res) => {
  const { videoId, videoPath, assetPath, analyzedSegments } = req.body;

  if (!videoId || !videoPath || !assetPath || !analyzedSegments) {
    return res.status(400).json({ error: 'Missing required data for rendering' });
  }

  const job = await videoQueue.add('render-video', {
    type: 'render',
    videoId,
    videoPath,
    assetPath,
    analyzedSegments,
  });

  res.json({
    message: 'Rendering started.',
    jobId: job.id,
  });
});

router.get('/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = await videoQueue.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const status = await job.getState();
  const progress = job.progress;
  const result = job.returnvalue;

  res.json({
    id: jobId,
    status,
    progress,
    result,
  });
});

export default router;
