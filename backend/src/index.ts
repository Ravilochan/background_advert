import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import morgan from 'morgan';

import uploadRouter from './routes/upload.js';
import './services/videoProcessor.js'; // Initialize worker

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(morgan('dev'));
app.use(cors());
app.use(express.json());

app.use('/api', uploadRouter);
app.use('/temp', express.static(path.join(process.cwd(), 'temp')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
