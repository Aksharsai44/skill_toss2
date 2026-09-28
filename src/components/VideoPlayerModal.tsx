import React, { useRef, useState, useEffect } from 'react';
import { X, Play, Pause, Volume2, VolumeX, Maximize, AlertTriangle, RefreshCw, Clock, Users, Eye, Sparkles } from 'lucide-react';
import type { ClassRecording } from '@/lib/types';

interface VideoPlayerModalProps {
  recording: ClassRecording | null;
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onRecordView?: (recordingId: string, studentId: string) => void;
}

export function VideoPlayerModal({ recording, isOpen, onClose, currentUserId, onRecordView }: VideoPlayerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [hasError, setHasError] = useState(false);
  const [hasTriggeredView, setHasTriggeredView] = useState(false);

  useEffect(() => {
    if (!isOpen || !recording) {
      setIsPlaying(false);
      setCurrentTime(0);
      setHasError(false);
      setHasTriggeredView(false);
      return;
    }

    setHasError(recording.status === 'failed');
  }, [isOpen, recording]);

  if (!isOpen || !recording) return null;

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        if (!hasTriggeredView && currentUserId && onRecordView) {
          onRecordView(recording.id, currentUserId);
          setHasTriggeredView(true);
        }
      }).catch(() => {
        setHasError(true);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const pad = (num: number) => String(num).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const isProcessing = recording.status === 'processing';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className="relative w-full max-w-4xl bg-ink-900 text-white rounded-2xl overflow-hidden shadow-2xl border border-ink-800 flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-ink-800 bg-ink-950/60">
          <div className="flex items-center gap-3 truncate">
            <div className="p-2 rounded-lg bg-primary-600/20 text-primary-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 className="font-semibold text-sm text-white truncate">{recording.title}</h2>
              <div className="flex items-center gap-2 text-xs text-ink-400 mt-0.5">
                <span className="text-primary-400 font-medium">{recording.batchName || recording.batch}</span>
                <span>•</span>
                <span>{recording.subject || recording.courseTitle || 'Class Recording'}</span>
                <span>•</span>
                <span>{recording.date}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink-400 hover:text-white hover:bg-ink-800 transition-colors"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Player Display Area */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-warning-500/20 border border-warning-500/40 flex items-center justify-center animate-pulse">
                <Clock className="w-7 h-7 text-warning-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Recording is Processing...</h3>
              <p className="text-xs text-ink-400 max-w-md">
                This class recording is currently being encoded and optimized by the server. Please check back in a few minutes.
              </p>
            </div>
          ) : hasError ? (
            <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-danger-500/20 border border-danger-500/40 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-danger-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Unable to Play Video</h3>
              <p className="text-xs text-ink-400 max-w-md">
                The recording stream URL is unavailable, invalid, or requires authentication.
              </p>
              <button
                onClick={() => {
                  setHasError(false);
                  if (videoRef.current) videoRef.current.load();
                }}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5 mt-2"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Retry Playback
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                src={recording.videoUrl}
                poster={recording.thumbnail}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleTimeUpdate}
                onError={() => setHasError(true)}
                onEnded={() => setIsPlaying(false)}
                onClick={handlePlayPause}
                className="w-full h-full object-contain cursor-pointer"
              />

              {/* Big Play Overlay when paused */}
              {!isPlaying && (
                <div
                  onClick={handlePlayPause}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer group-hover:bg-black/30 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                    <Play className="w-8 h-8 ml-1 fill-white" />
                  </div>
                </div>
              )}

              {/* Bottom Custom Control Bar */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col gap-2">
                {/* Timeline Scrubber */}
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:h-2 transition-all"
                />

                <div className="flex items-center justify-between text-xs text-white">
                  <div className="flex items-center gap-3">
                    <button onClick={handlePlayPause} className="hover:text-primary-400 transition-colors">
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-white" />}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button onClick={toggleMute} className="hover:text-primary-400 transition-colors">
                        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary-500"
                      />
                    </div>

                    <span className="font-mono text-[11px] text-ink-300">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Speed Selector */}
                    <div className="flex items-center gap-1 bg-ink-800/80 px-2 py-0.5 rounded border border-ink-700 text-[11px]">
                      {[0.5, 1, 1.25, 1.5, 2].map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedChange(s)}
                          className={`px-1.5 py-0.5 rounded transition-colors ${playbackSpeed === s ? 'bg-primary-600 text-white font-semibold' : 'text-ink-300 hover:text-white'}`}
                        >
                          {s}x
                        </button>
                      ))}
                    </div>

                    <button onClick={toggleFullscreen} className="hover:text-primary-400 transition-colors">
                      <Maximize className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Meta Info Bar */}
        <div className="px-5 py-3 border-t border-ink-800 bg-ink-950/60 flex items-center justify-between text-xs text-ink-300">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-ink-300">
              <Users className="w-3.5 h-3.5 text-primary-400" />
              <strong className="text-white">{recording.attendees}</strong> attendees
            </span>
            <span className="flex items-center gap-1.5 text-ink-300">
              <Eye className="w-3.5 h-3.5 text-accent-400" />
              <strong className="text-white">{recording.viewsCount}</strong> views
            </span>
            {recording.teacherName && (
              <span className="text-ink-400">
                Instructor: <span className="text-ink-200">{recording.teacherName}</span>
              </span>
            )}
          </div>

          <div className="text-[11px] text-ink-400">
            Duration: <span className="text-ink-200 font-mono">{recording.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
