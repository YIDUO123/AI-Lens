/**
 * AI Lens Logo · v5 · Minimal Infinity
 * 纯粹的无限符号 · 珊瑚金渐变 · 干净有力
 * 中央交叉处有一个白色高光,暗示"焦点"
 */
export function LensLogo({ size = 44, className = '' }: { size?: number; className?: string }) {
  const gid = 'infinity-grad-v5';
  const shadowId = 'infinity-shadow';
  return (
    <svg
      width={size}
      height={(size * 24) / 48}
      viewBox="0 0 48 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AI Lens"
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="48" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#E85A24" />
          <stop offset="50%" stopColor="#FF8B4D" />
          <stop offset="100%" stopColor="#FFB84D" />
        </linearGradient>
        <filter id={shadowId}>
          <feDropShadow dx="0.4" dy="0.6" stdDeviation="0.3" floodColor="#1a1a1a" floodOpacity="0.35" />
        </filter>
      </defs>

      <path
        d="M 6 12
           Q 6 3, 15 3
           Q 24 3, 24 12
           Q 24 21, 33 21
           Q 42 21, 42 12
           Q 42 3, 33 3
           Q 24 3, 24 12
           Q 24 21, 15 21
           Q 6 21, 6 12 Z"
        stroke={`url(#${gid})`}
        strokeWidth="4.2"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${shadowId})`}
      />
    </svg>
  );
}
