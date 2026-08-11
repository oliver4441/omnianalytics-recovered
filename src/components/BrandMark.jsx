export default function BrandMark({ size = 30, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      height={size}
      viewBox="0 0 36 36"
      width={size}
    >
      <defs>
        <linearGradient id="omni-mark-gradient" x1="4" x2="32" y1="3" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#888CFF" />
          <stop offset="1" stopColor="#5147EE" />
        </linearGradient>
      </defs>
      <rect width="36" height="36" rx="10" fill="url(#omni-mark-gradient)" />
      <path d="M11.2 12.2A8.4 8.4 0 0 1 25 18.6" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <path d="M24.8 23.8A8.4 8.4 0 0 1 11 17.4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26.1" cy="19" r="2.2" fill="white" />
      <circle cx="9.9" cy="17" r="2.2" fill="white" />
    </svg>
  );
}
