import React from "react";

interface LogoProps {
  className?: string;
  variant?: "horizontal" | "stacked" | "icon-only";
  iconColor?: string; // hex or tailwind class
  textColor?: string;
  badgeText?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

/**
 * Universal Hanoled H-Mark Icon
 * Exact vector geometry from Hanoled Brand Guidelines 2026:
 * Two solid rounded pillars joined by an ascending growth curve line.
 */
export function HanoledIcon({
  className = "w-8 h-8",
  color = "#1447E6",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      fill={color.startsWith("#") ? color : undefined}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M 26.5 16 C 21.8 16 18 19.8 18 24.5 L 18 75.5 C 18 80.2 21.8 84 26.5 84 C 31.2 84 35 80.2 35 75.5 L 35 63.5 L 65 43.5 L 65 75.5 C 65 80.2 68.8 84 73.5 84 C 78.2 84 82 80.2 82 75.5 L 82 24.5 C 82 19.8 78.2 16 73.5 16 C 68.8 16 65 19.8 65 24.5 L 65 36.5 L 35 56.5 L 35 24.5 C 35 19.8 31.2 16 26.5 16 Z"
        className={!color.startsWith("#") ? color : undefined}
      />
    </svg>
  );
}

/**
 * Universal Hanoled CBT Brand Lockup
 */
export function Logo({
  className = "w-8 h-8",
  variant = "horizontal",
  iconColor = "#1447E6",
  textColor = "text-[#0B1220]",
  badgeText = "CBT",
  size = "md",
}: LogoProps) {
  if (variant === "icon-only") {
    return <HanoledIcon className={className} color={iconColor} />;
  }

  const textSizes = {
    sm: { brand: "text-lg", badge: "text-[10px] px-1.5 py-0.5" },
    md: { brand: "text-xl", badge: "text-xs px-2 py-0.5" },
    lg: { brand: "text-2xl", badge: "text-xs px-2.5 py-1" },
    xl: { brand: "text-3xl", badge: "text-sm px-3 py-1" },
  }[size];

  if (variant === "stacked") {
    return (
      <div className="flex flex-col items-center select-none text-center gap-1.5">
        <HanoledIcon className={className} color={iconColor} />
        <div className="flex items-center gap-1.5">
          <span className={`font-bold tracking-tight ${textSizes.brand} ${textColor}`}>
            Hanoled
          </span>
          {badgeText && (
            <span className={`font-bold tracking-wide rounded-md bg-[#1447E6]/10 text-[#1447E6] ${textSizes.badge}`}>
              {badgeText}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2.5 select-none">
      <HanoledIcon className={className} color={iconColor} />
      <div className="flex items-center space-x-1.5">
        <span className={`font-bold tracking-tight ${textSizes.brand} ${textColor}`}>
          Hanoled
        </span>
        {badgeText && (
          <span className={`font-bold tracking-wider rounded-md bg-[#1447E6]/10 text-[#1447E6] border border-[#1447E6]/20 uppercase ${textSizes.badge}`}>
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}

export default Logo;
