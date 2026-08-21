"use client";

import React from "react";
import { cn } from "@/lib/utils";

type HanoledLoaderProps = {
  label?: string;
  size?: number;
  className?: string;
  fullScreen?: boolean;
};

export function HanoledLoader({
  label,
  size = 130,
  className,
  fullScreen = true,
}: HanoledLoaderProps) {
  const content = (
    <div className={cn("flex flex-col items-center justify-center text-center", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        role="status"
        aria-label="Loading"
      >
        {/* Muted resting stroke */}
        <path
          d="M 36 40 L 36 160 L 164 40 L 164 160"
          stroke="#B7C4F5"
          strokeWidth="42"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Full Hanoled Blue, drawn in progressively */}
        <path
          pathLength={100}
          d="M 36 40 L 36 160 L 164 40 L 164 160"
          stroke="#1447E6"
          strokeWidth="42"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="animate-hanoled-fill"
          style={{ strokeDasharray: 100 }}
        />
      </svg>
      {label && <p className="mt-4 text-sm font-medium text-slate-500">{label}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-white">
        {content}
      </div>
    );
  }

  return content;
}
