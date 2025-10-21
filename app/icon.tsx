import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
        <defs>
          <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6ee7b7" />
            <stop offset="1" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <rect width="512" height="512" rx="96" fill="#0f1115" />
        <rect x="64" y="64" width="384" height="384" rx="80" fill="url(#g)" />
        <text
          x="50%"
          y="57%"
          textAnchor="middle"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto"
          fontWeight="900"
          fontSize="240"
          fill="#0b1020"
        >
          N
        </text>
      </svg>
    ),
    size
  );
}