import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0f1115',
          borderRadius: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            width: 136,
            height: 136,
            borderRadius: 28,
            background: 'linear-gradient(225deg,#6ee7b7 0%,#3b82f6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 86,
              lineHeight: 1,
              color: '#0b1020',
              transform: 'translateY(-2px)',
            }}
          >
            N
          </div>
        </div>
      </div>
    ),
    size
  );
}