import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: '24px',
            padding: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
            maxWidth: '900px',
            width: '90%',
          }}
        >
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#667eea',
              marginBottom: '24px',
            }}
          >
            Nowish ⚡
          </div>

          <div
            style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#64748b',
              marginBottom: '12px',
            }}
          >
            About to do something?
          </div>

          <div
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#1e293b',
              lineHeight: '1.1',
              marginBottom: '32px',
            }}
          >
            See who&apos;s in.
          </div>

          <div
            style={{
              fontSize: '24px',
              color: '#64748b',
              fontStyle: 'italic',
              fontWeight: '500',
            }}
          >
            For moments, not parties.
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}