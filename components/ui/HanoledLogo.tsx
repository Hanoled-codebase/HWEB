import React from "react";
import Link from "next/link";

interface HanoledIconProps {
  className?: string;
  color?: string;
}

export function HanoledIcon({ className = "h-8 w-8", color }: HanoledIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={color ? { color } : undefined}
      aria-hidden="true"
    >
      <rect x="18" y="16" width="16" height="68" rx="8" fill="currentColor" />
      <rect x="66" y="16" width="16" height="68" rx="8" fill="currentColor" />
      <path
        d="M 26 62 L 74 38"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface HanoledLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  iconOnly?: boolean;
  variant?: "blue" | "white" | "ink" | "gold";
  className?: string;
  href?: string;
}

export function HanoledLogo({
  size = "md",
  iconOnly = false,
  variant = "blue",
  className = "",
  href,
}: HanoledLogoProps) {
  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-10 w-10",
    xl: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const iconColorClasses = {
    blue: "text-[#1447E6]",
    white: "text-white",
    ink: "text-[#0B1220]",
    gold: "text-[#F5A623]",
  };

  const textColorClasses = {
    blue: "text-[#0B1220]",
    white: "text-white",
    ink: "text-[#0B1220]",
    gold: "text-[#0B1220]",
  };

  const content = (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <HanoledIcon className={`${iconSizes[size]} ${iconColorClasses[variant]} shrink-0`} />
      {!iconOnly && (
        <span className={`font-bold tracking-tight ${textColorClasses[variant]} ${textSizes[size]}`}>
          Hanoled
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
