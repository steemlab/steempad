"use client";

interface SteemPadLogoProps {
  className?: string;
  height?: number;
}

export default function SteemPadLogo({
  className = "h-8 w-auto",
  height = 32,
}: SteemPadLogoProps) {
  return (
    <svg
      height={height}
      viewBox="0 0 144 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform group-hover:scale-[1.02] ${className}`}
      aria-label="SteemPad Logo"
    >
      <defs>
        {/* Gradient for the SteemPad Waves Mark */}
        <linearGradient id="steemGlow" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>

        <linearGradient id="steemGlowSubtle" x1="0" y1="0" x2="34" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>

        {/* Cyan text accent gradient */}
        <linearGradient id="cyanAccent" x1="108" y1="8" x2="162" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* ─── Mark: 3 Dynamic Steem Editorial Waves ─── */}
      <g transform="translate(1, 1)">
        {/* Left Wave */}
        <path
          d="M 5 10 C 2.5 12.5, 2 17, 4 20 C 6 23, 7 24, 7.5 26 C 8 28, 7 29, 5.5 30 C 4.5 30.5, 3.5 30, 3 29 C 1 25, 1 18, 4 12 C 4.5 11, 4.8 10.5, 5 10 Z"
          fill="url(#steemGlowSubtle)"
          opacity="0.8"
        />

        {/* Center / Primary Wave (Stronger elevation & quill flourish) */}
        <path
          d="M 14.5 3 C 11.5 6, 10.5 12, 12.5 17.5 C 14.5 22.5, 16 24.5, 16.5 27.5 C 17 30, 15.5 31.5, 13.5 32 C 12 32.3, 10.8 31.5, 10.2 30 C 8 23.5, 8.5 14, 13 6 C 13.5 5, 14 4, 14.5 3 Z"
          fill="url(#steemGlow)"
        />

        {/* Right Wave */}
        <path
          d="M 23 8 C 20.5 11, 19.8 16, 21.5 20.5 C 23 24, 24 25.5, 24.5 27.5 C 25 29.5, 24 30.5, 22.5 31 C 21.2 31.3, 20.2 30.5, 19.8 29.2 C 18 24, 18.2 16.5, 22 10.5 C 22.4 9.8, 22.7 9, 23 8 Z"
          fill="url(#steemGlow)"
          opacity="0.9"
        />

        {/* Subtle dynamic node dot */}
        <circle cx="28.5" cy="7.5" r="2" fill="#22d3ee" className="animate-pulse" />
      </g>

      {/* ─── Typography: Horizontal SteemPad Wordmark ─── */}
      <text
        x="38"
        y="23.5"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize="19.5"
        fontWeight="800"
        letterSpacing="-0.035em"
      >
        <tspan fill="#ffffff">Steem</tspan>
        <tspan fill="url(#cyanAccent)" dx="0.5">Pad</tspan>
      </text>
    </svg>
  );
}
