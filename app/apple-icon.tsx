export default function AppleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6ee7b7"/>
          <stop offset="1" stopColor="#3b82f6"/>
        </linearGradient>
      </defs>
      <rect width="180" height="180" rx="36" fill="#0f1115"/>
      <rect x="22" y="22" width="136" height="136" rx="28" fill="url(#g)"/>
      <text x="50%" y="59%" textAnchor="middle" fontFamily="system-ui, -apple-system, Segoe UI, Roboto" fontWeight="900" fontSize="86" fill="#0b1020">N</text>
    </svg>
  );
}