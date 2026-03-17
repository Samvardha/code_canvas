"use client";

import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoPreviewProps {
  url: string;
}

export const VideoPreview = ({ url }: VideoPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleFSChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFSChange);
    document.addEventListener("webkitfullscreenchange", handleFSChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFSChange);
      document.removeEventListener("webkitfullscreenchange", handleFSChange);
    };
  }, []);

  useEffect(() => {
    let rafId: number;
    const updateProgress = () => {
      if (videoRef.current && isPlaying) {
        const p =
          (videoRef.current.currentTime / videoRef.current.duration) * 100;
        setProgress(p);
        rafId = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      rafId = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullScreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (containerRef.current) {
      if (!document.fullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        } else if ((containerRef.current as any).msRequestFullscreen) {
          (containerRef.current as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative group/video flex items-center justify-center bg-black cursor-pointer overflow-hidden rounded-sm border border-border transition-all ${
        isFullScreen
          ? "fixed inset-0 z-100 w-screen h-screen"
          : "h-40 w-auto aspect-video"
      }`}
      onClick={togglePlay}
    >
      <video
        ref={videoRef}
        src={url}
        className="h-full w-full object-contain pointer-events-none"
        muted={isMuted}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        preload="metadata"
      />

      {/* Custom Controls Overlay */}
      <div
        className={`absolute inset-x-0 bottom-0 top-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/video:opacity-100 transition-opacity flex flex-col justify-between p-4 z-10 ${
          isFullScreen ? "opacity-100" : ""
        }`}
      >
        <div className="flex-1 flex items-center justify-center">
          <div
            className={`${isFullScreen ? "w-16 h-16" : "w-10 h-10"} flex items-center justify-center transition-all transform active:scale-95`}
          >
            {isPlaying ? (
              <Pause size={isFullScreen ? 32 : 20} fill="currentColor" />
            ) : (
              <Play size={isFullScreen ? 32 : 20} fill="currentColor" />
            )}
          </div>
        </div>

        <div className="">
          {/* Progress Bar */}
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden cursor-pointer group/progress">
            <div
              className="h-full bg-white/50 relative"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={toggleMute}
              className="p-2 transition-colors cursor-pointer text-text-secondary hover:text-white"
            >
              {isMuted ? (
                <VolumeX size={isFullScreen ? 20 : 14} />
              ) : (
                <Volume2 size={isFullScreen ? 20 : 14} />
              )}
            </button>
            <button
              onClick={toggleFullScreen}
              className="p-2 transition-colors cursor-pointer text-text-secondary hover:text-white"
            >
              <Maximize size={isFullScreen ? 20 : 14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
