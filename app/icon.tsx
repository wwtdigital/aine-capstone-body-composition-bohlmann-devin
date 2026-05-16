import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          borderRadius: 96,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {/* Body silhouette */}
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.9)',
              marginBottom: 8,
            }}
          />
          <div
            style={{
              width: 140,
              height: 160,
              borderRadius: '40px 40px 60px 60px',
              background: 'rgba(255,255,255,0.9)',
            }}
          />
          {/* BCC text */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: 'white',
              letterSpacing: -2,
              marginTop: 16,
              fontFamily: 'sans-serif',
            }}
          >
            BCC
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
