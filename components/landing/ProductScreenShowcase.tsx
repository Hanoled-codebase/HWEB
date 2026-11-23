"use client";

import React, { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProductScreenFrameProps {
  title: string;
  urlPath?: string;
  badge?: string;
  imageSrc: string;
  imageAlt: string;
  videoSrc?: string;
  width?: number;
  height?: number;
  className?: string;
  compact?: boolean;
}

export function ProductScreenFrame({
  title,
  urlPath = "hanoled.com/dashboard",
  badge,
  imageSrc,
  imageAlt,
  videoSrc,
  width = 1280,
  height = 800,
  className,
  compact = false,
}: ProductScreenFrameProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMotionPreference = (reduceMotion: boolean) => {
      if (reduceMotion) {
        video.removeAttribute("autoplay");
        video.pause();
        setIsPlaying(false);
      } else {
        video
          .play()
          .then(() => setIsPlaying(true))
          .catch(() => setIsPlaying(false));
      }
    };

    applyMotionPreference(mq.matches);

    const onChange = (event: MediaQueryListEvent) => {
      applyMotionPreference(event.matches);
    };
    mq.addEventListener("change", onChange);
    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, [videoSrc]);

  const handleTogglePlay = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  const lazyVideoAttr: Record<string, string> = { loading: "lazy" };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-lg",
        className,
      )}
    >
      {/* Browser chrome top bar */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-slate-200/80 bg-slate-900 px-3 text-white",
          compact ? "py-1.5" : "py-2.5 sm:px-4",
        )}
      >
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/90" />
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-center">
          <span
            className={cn(
              "truncate rounded-md bg-white/10 px-2.5 py-0.5 font-mono text-slate-200",
              compact ? "text-[10px]" : "text-[11px]",
            )}
          >
            {urlPath}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="hidden rounded-full bg-[#1447E6] px-2 py-0.5 text-[10px] font-bold text-white sm:inline-block">
              {badge}
            </span>
          )}
          {videoSrc && (
            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={
                isPlaying
                  ? `Pause ${title} screen recording`
                  : `Play ${title} screen recording`
              }
              className="inline-flex min-h-7 items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3 w-3" aria-hidden="true" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3 w-3" aria-hidden="true" />
                  <span>Play</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Live Video or High-DPI Screenshot Viewport */}
      <div className="relative bg-slate-100">
        {videoSrc ? (
          <video
            ref={videoRef}
            {...lazyVideoAttr}
            width={width}
            height={height}
            poster={imageSrc}
            preload="metadata"
            muted
            loop
            playsInline
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            className="block h-auto w-full object-cover"
          >
            <source src={videoSrc} type="video/mp4" />
          </video>
        ) : (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={imageAlt}
            width={width}
            height={height}
            loading="lazy"
            className="block h-auto w-full object-cover object-top"
          />
        )}
      </div>
    </div>
  );
}
