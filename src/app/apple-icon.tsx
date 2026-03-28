import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#6366f1',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '22px',
          fontSize: 120,
          fontWeight: 700,
          color: 'white',
        }}
      >
        C
      </div>
    ),
    { ...size }
  )
}
