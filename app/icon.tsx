import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0f1115',
          display: 'grid',
          placeItems: 'center',
          borderRadius: 96,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        }}
      >
        <div
          style={{
            width: 384,
            height: 384,
            borderRadius: 80,
            background: 'linear-gradient(225deg,#6ee7b7 0%,#3b82f6 100%)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 240,
              lineHeight: 1,
              color: '#0b1020',
              transform: 'translateY(-6px)', // optical centering
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