import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';

const execPromise = util.promisify(exec);

export interface Segment {
  startTime: number;
  endTime: number;
  keyframePath: string;
}

export const extractKeyframesAndDetectScenes = async (
  videoPath: string,
  outputDir: string
): Promise<Segment[]> => {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Detect scenes and extract keyframes. Output metadata to stderr.
  // Using -fps_mode vfr instead of deprecated -vsync.
  // Forcing -pix_fmt yuv420p for MJPEG compatibility with 10-bit/4:2:2 inputs.
  // Added -update 1 as a fallback or ensuring we get output.
  const command = `ffmpeg -i "${videoPath}" -vf "select='gt(scene,0.1)+eq(n,0)',metadata=print" -fps_mode vfr -pix_fmt yuv420p -q:v 2 "${path.join(outputDir, 'keyframe_%03d.jpg')}"`;

  try {
    const { stderr } = await execPromise(command);
    
    const duration = await getVideoDuration(videoPath);
    const timestamps: number[] = [0]; // Start with 0
    
    // Parse timestamps from stderr (FFmpeg outputs metadata to stderr by default with metadata=print)
    const ptsRegex = /pts_time:(\d+\.?\d*)/g;
    let match: RegExpExecArray | null;
    while ((match = ptsRegex.exec(stderr)) !== null) {
      if (match[1]) {
        const ts = parseFloat(match[1]);
        if (!timestamps.includes(ts)) {
          timestamps.push(ts);
        }
      }
    }
    
    timestamps.sort((a, b) => a - b);
    
    const files = fs.readdirSync(outputDir)
      .filter(f => f.startsWith('keyframe_'))
      .sort();
    
    const segments: Segment[] = [];
    
    for (let i = 0; i < timestamps.length; i++) {
      const startTime = timestamps[i] ?? 0;
      const endTime = timestamps[i + 1] ?? duration;
      
      // Map each segment to the corresponding keyframe file
      // If there are more segments than files (e.g. first segment at 0), handle it.
      const keyframeFile = files[i] || files[files.length - 1];
      
      if (keyframeFile) {
        segments.push({
          startTime,
          endTime,
          keyframePath: path.join(outputDir, keyframeFile)
        });
      }
    }

    return segments;
  } catch (error) {
    console.error('Error running FFmpeg:', error);
    throw error;
  }
};

export const getVideoDuration = async (videoPath: string): Promise<number> => {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
  const { stdout } = await execPromise(command);
  return parseFloat(stdout.trim());
};

export interface RenderParams {
  videoPath: string;
  assetPath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const renderSegment = async (params: RenderParams): Promise<void> => {
  const { videoPath, assetPath, outputPath, startTime, endTime, region } = params;

  // sx0,sy0 = top-left
  // sx1,sy1 = top-right
  // sx2,sy2 = bottom-left
  // sx3,sy3 = bottom-right
  const filter = `
    [1:v]scale=${region.width}:${region.height},
    format=rgba,
    colorchannelmixer=aa=0.9[ad];
    [0:v][ad]overlay=x=${region.x}:y=${region.y}:enable='between(t,${startTime},${endTime})'
  `.replace(/\s+/g, '');

  const command = `ffmpeg -y -i "${videoPath}" -i "${assetPath}" -filter_complex "${filter}" -pix_fmt yuv420p -c:a copy "${outputPath}"`;

  try {
    await execPromise(command);
  } catch (error) {
    console.error('Error rendering segment:', error);
    throw error;
  }
};

export const renderPreviewFrame = async (
  framePath: string,
  assetPath: string,
  outputPath: string,
  region: { x: number; y: number; width: number; height: number }
): Promise<void> => {
  const filter = `
    [1:v]scale=${region.width}:${region.height},
    format=rgba,
    colorchannelmixer=aa=0.9[ad];
    [0:v][ad]overlay=x=${region.x}:y=${region.y}
  `.replace(/\s+/g, '');

  const command = `ffmpeg -y -i "${framePath}" -i "${assetPath}" -filter_complex "${filter}" -frames:v 1 "${outputPath}"`;

  try {
    await execPromise(command);
  } catch (error) {
    console.error('Error rendering preview frame:', error);
    throw error;
  }
};

export const concatenateVideos = async (videoPaths: string[], outputPath: string): Promise<void> => {
  const listPath = path.join(path.dirname(outputPath), 'concat_list.txt');
  const content = videoPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
  fs.writeFileSync(listPath, content);

  const command = `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${outputPath}"`;

  try {
    await execPromise(command);
  } catch (error) {
    console.error('Error concatenating videos:', error);
    throw error;
  } finally {
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
  }
};
