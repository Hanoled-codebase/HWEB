import type { SVGProps } from "react";

/**
 * Small two-layer illustrations for the marketing site's feature/capability
 * grids. Each shape uses `currentColor` at varying opacity so it always
 * inherits the brand-safe tint applied by its wrapper (Hanoled Blue or Deep
 * Ink) instead of hardcoding an off-palette color.
 */

type IllustrationProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 64 64",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  "aria-hidden": true,
} as const;

export function SchoolAdminIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="10" y="26" width="34" height="28" rx="4" fill="currentColor" fillOpacity="0.16" />
      <path d="M8 28 27 14l19 14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="21" y="34" width="7" height="9" rx="1.5" fill="currentColor" />
      <rect x="32" y="34" width="7" height="9" rx="1.5" fill="currentColor" fillOpacity="0.55" />
      <rect x="21" y="46" width="18" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" />
      <circle cx="47" cy="48" r="9" fill="currentColor" />
      <path d="M43 48.2l3 3 5-6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AcademicManagementIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <path d="M32 20c-4-3-11-4-18-2v28c7-2 14-1 18 2 4-3 11-4 18-2V18c-7-2-14-1-18 2z" fill="currentColor" fillOpacity="0.16" />
      <path d="M32 20v28" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M17 22c4-1.2 8.5-1 12 1M17 30c4-1.2 8.5-1 12 1M35 23c3.5-2 8-2.2 12-1M35 31c3.5-2 8-2.2 12-1" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="47" cy="16" r="8" fill="currentColor" />
      <path d="M43.2 16.1l2.6 2.6 4.6-5.2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function FinancialManagementIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="18" width="40" height="30" rx="6" fill="currentColor" fillOpacity="0.16" />
      <rect x="8" y="18" width="40" height="9" rx="4" fill="currentColor" fillOpacity="0.4" />
      <circle cx="40" cy="37" r="5.5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        <path d="M46 50v-8" />
        <path d="M52 50v-14" />
        <path d="M40 50v-4" />
      </g>
    </svg>
  );
}

export function CommunicationPortalIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 16h32a5 5 0 0 1 5 5v14a5 5 0 0 1-5 5H24l-9 8v-8h-5a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5z" fill="currentColor" fillOpacity="0.16" />
      <circle cx="19" cy="28" r="2.6" fill="currentColor" />
      <circle cx="28" cy="28" r="2.6" fill="currentColor" />
      <circle cx="37" cy="28" r="2.6" fill="currentColor" />
      <circle cx="49" cy="15" r="8" fill="currentColor" />
      <path d="M46 15h6M49 12v6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function OperationsWelfareIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="9" y="14" width="36" height="34" rx="5" fill="currentColor" fillOpacity="0.16" />
      <path d="M9 24h36" stroke="currentColor" strokeWidth="3" />
      <path d="M18 10v8M36 10v8" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
      <g fill="currentColor" fillOpacity="0.55">
        <rect x="15" y="30" width="6" height="6" rx="1.5" />
        <rect x="24" y="30" width="6" height="6" rx="1.5" />
        <rect x="33" y="30" width="6" height="6" rx="1.5" />
        <rect x="15" y="39" width="6" height="6" rx="1.5" />
        <rect x="24" y="39" width="6" height="6" rx="1.5" />
      </g>
      <circle cx="47" cy="47" r="9" fill="currentColor" />
      <path d="M47 43v5l3.4 2" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AdmissionsPortalIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="14" y="8" width="28" height="36" rx="4" fill="currentColor" fillOpacity="0.16" />
      <path d="M20 18h16M20 25h16M20 32h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="42" r="10" fill="currentColor" />
      <path d="M37.5 42l3.3 3.3L47 38" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ExamEngineIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="12" width="40" height="27" rx="4" fill="currentColor" fillOpacity="0.16" />
      <rect x="8" y="12" width="40" height="27" rx="4" stroke="currentColor" strokeWidth="2.4" />
      <path d="M16 21h18M16 27h12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 45h8M28 39v6" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="47" cy="47" r="9" fill="currentColor" />
      <path d="M43 47.2l2.8 2.8 5-6" stroke="#fff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CustomDashboardsIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="10" width="40" height="38" rx="6" fill="currentColor" fillOpacity="0.16" />
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round">
        <path d="M17 39v-8" />
        <path d="M25 39V25" />
        <path d="M33 39v-4" />
      </g>
      <circle cx="41" cy="25" r="8" fill="none" stroke="currentColor" strokeWidth="3.4" />
      <path d="M41 25V18a7 7 0 0 1 7 7h-7z" fill="currentColor" />
    </svg>
  );
}

export function SecurityRolesIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <path d="M28 8l18 6v13c0 12-7.5 20.6-18 25-10.5-4.4-18-13-18-25V14z" fill="currentColor" fillOpacity="0.16" />
      <path d="M28 8l18 6v13c0 12-7.5 20.6-18 25-10.5-4.4-18-13-18-25V14z" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="28" cy="26" r="5.5" fill="currentColor" />
      <path d="M28 33c-5 0-9 2.6-9 6.5V41h18v-1.5c0-3.9-4-6.5-9-6.5z" fill="currentColor" fillOpacity="0.6" />
    </svg>
  );
}

export function QuestionBankIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="10" y="22" width="30" height="24" rx="4" fill="currentColor" fillOpacity="0.18" />
      <rect x="16" y="16" width="30" height="24" rx="4" fill="currentColor" fillOpacity="0.35" />
      <rect x="22" y="10" width="30" height="24" rx="4" fill="currentColor" />
      <path d="M31 18a4 4 0 1 1 5.4 3.7c-1.4.6-2.2 1.3-2.2 2.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="34" cy="28.5" r="1.4" fill="#fff" />
    </svg>
  );
}

export function RandomisedPapersIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="12" width="22" height="28" rx="4" transform="rotate(-8 8 12)" fill="currentColor" fillOpacity="0.2" />
      <rect x="34" y="14" width="22" height="28" rx="4" transform="rotate(8 34 14)" fill="currentColor" fillOpacity="0.4" />
      <path d="M20 40h4M20 46h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 22h14M37 22l-4-4M37 22l-4 4" />
        <path d="M41 30H27M27 30l4-4M27 30l4 4" />
      </g>
    </svg>
  );
}

export function TimedExamsIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="8" y="16" width="22" height="30" rx="4" fill="currentColor" fillOpacity="0.18" />
      <path d="M14 24h10M14 30h7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="40" cy="34" r="16" fill="currentColor" fillOpacity="0.16" />
      <circle cx="40" cy="34" r="16" stroke="currentColor" strokeWidth="3" />
      <path d="M40 25v9l7 5" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function InstantGradingIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="26" cy="32" r="20" fill="currentColor" fillOpacity="0.14" />
      <path d="M29 12 14 34h10l-3 18 17-24H28l3-16z" fill="currentColor" />
      <circle cx="45" cy="44" r="10" fill="currentColor" />
      <path d="M40.5 44l3 3 6-7" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AnyDeviceIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <rect x="6" y="14" width="34" height="23" rx="3" fill="currentColor" fillOpacity="0.18" />
      <path d="M2 37h42l-4 6H6z" fill="currentColor" fillOpacity="0.4" />
      <rect x="38" y="24" width="16" height="28" rx="4" fill="currentColor" />
      <rect x="42" y="28" width="8" height="17" rx="1.2" fill="#fff" fillOpacity="0.9" />
      <circle cx="46" cy="48" r="1.6" fill="#fff" />
    </svg>
  );
}

export function AntiCheatIllustration(props: IllustrationProps) {
  return (
    <svg {...base} {...props}>
      <path d="M28 8l18 6v13c0 12-7.5 20.6-18 25-10.5-4.4-18-13-18-25V14z" fill="currentColor" fillOpacity="0.16" />
      <path d="M28 8l18 6v13c0 12-7.5 20.6-18 25-10.5-4.4-18-13-18-25V14z" stroke="currentColor" strokeWidth="2.4" />
      <path d="M18 26c3.4-4 6.8-6 10-6s6.6 2 10 6c-3.4 4-6.8 6-10 6s-6.6-2-10-6z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
      <circle cx="28" cy="26" r="3.2" fill="currentColor" />
    </svg>
  );
}
