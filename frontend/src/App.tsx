import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { Upload, Video, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useStore } from './store/useStore';
import './App.css';

const API_BASE_URL = 'http://localhost:3001/api';

function App() {
  const { 
    jobId, videoId, status, progress, segments, processedVideoUrl, 
    videoPreview, assetPreview, 
    setVideoData, updateStatus, setResult, setPreviews 
  } = useStore();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const onVideoDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setVideoFile(file);
      setPreviews(URL.createObjectURL(file), assetPreview);
    }
  }, [assetPreview, setPreviews]);

  const onAssetDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setAssetFile(file);
      setPreviews(videoPreview, URL.createObjectURL(file));
    }
  }, [videoPreview, setPreviews]);

  const { getRootProps: getVideoRootProps, getInputProps: getVideoInputProps, isDragActive: isVideoDragActive } = useDropzone({
    onDrop: onVideoDrop,
    accept: { 'video/*': [] },
    multiple: false
  });

  const { getRootProps: getAssetRootProps, getInputProps: getAssetInputProps, isDragActive: isAssetDragActive } = useDropzone({
    onDrop: onAssetDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const handleUpload = async () => {
    if (!videoFile || !assetFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('video', videoFile);
    formData.append('asset', assetFile);

    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData);
      setVideoData({
        videoId: response.data.video.id,
        assetId: response.data.asset.id,
        jobId: response.data.jobId
      });
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    let interval: number | undefined;

    if (jobId && (status === 'active' || status === 'upload_complete' || status === 'waiting')) {
      interval = window.setInterval(async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/status/${jobId}`);
          const { status: jobStatus, progress: jobProgress, result } = response.data;
          
          if (jobStatus === 'completed') {
            setResult(result);
            clearInterval(interval);
          } else {
            updateStatus(jobStatus, jobProgress || 0);
          }
        } catch (error) {
          console.error('Failed to poll status', error);
          clearInterval(interval);
        }
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [jobId, status, updateStatus, setResult]);

  return (
    <div className="container">
      <header>
        <h1>Background Ad Inserter</h1>
        <p>AI-powered virtual product placement</p>
      </header>

      <div className="main-content">
        <div className="previews-container">
          {videoPreview && (
            <div className="preview-card">
              <h3>Original Video</h3>
              <video src={videoPreview} controls className="preview-media" />
            </div>
          )}
          {assetPreview && (
            <div className="preview-card">
              <h3>Ad Asset</h3>
              <img src={assetPreview} alt="Asset Preview" className="preview-media" />
            </div>
          )}
        </div>

        {!jobId ? (
          <div className="upload-section">
            <div className="dropzones">
              <div {...getVideoRootProps()} className={`dropzone ${isVideoDragActive ? 'active' : ''}`}>
                <input {...getVideoInputProps()} />
                <Video size={48} />
                {videoFile ? <p>{videoFile.name}</p> : <p>Drop video here or click</p>}
              </div>

              <div {...getAssetRootProps()} className={`dropzone ${isAssetDragActive ? 'active' : ''}`}>
                <input {...getAssetInputProps()} />
                <ImageIcon size={48} />
                {assetFile ? <p>{assetFile.name}</p> : <p>Drop ad asset here or click</p>}
              </div>
            </div>

            <button 
              onClick={handleUpload} 
              disabled={!videoFile || !assetFile || isUploading}
              className="upload-button"
            >
              {isUploading ? <Loader2 className="animate-spin" /> : <Upload />}
              {isUploading ? 'Uploading...' : 'Process Video'}
            </button>
          </div>
        ) : (
          <div className="processing-section">
            <div className="status-header">
              <h2>{status === 'completed' ? 'Processing Complete' : 'Processing Video'}</h2>
              <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
              </div>
              <p className="status-text">{status === 'completed' ? 'Final result ready below' : `Step: ${status} (${progress}%)`}</p>
            </div>
            
            {processedVideoUrl && (
              <div className="result-section">
                <h3>Final Result</h3>
                <video 
                  src={`http://localhost:3001${processedVideoUrl}`} 
                  controls 
                  className="result-video"
                />
                <div className="actions">
                  <a 
                    href={`http://localhost:3001${processedVideoUrl}`} 
                    download 
                    className="download-button"
                  >
                    Download Result
                  </a>
                </div>
              </div>
            )}
            
            {segments.length > 0 && (
              <div className="analysis-results">
                <h3>Scene Analysis</h3>
                <div className="segments-grid">
                  {segments.map((segment, idx) => (
                    <div key={idx} className="segment-card">
                      <img src={`http://localhost:3001/temp/${videoId}/${segment.keyframePath.split('/').pop()}`} alt={`Keyframe ${idx}`} />
                      <p>{segment.startTime.toFixed(2)}s - {segment.endTime.toFixed(2)}s</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
