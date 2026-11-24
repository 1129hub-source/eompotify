import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Noto_Sans_KR } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: ['300', '400', '500', '600', '700', '800'] })
const notoKr = Noto_Sans_KR({ preload: false, variable: '--font-noto-kr', weight: ['400', '500', '600', '700'] })

export const metadata: Metadata = {
  title: 'EOMpotify',
  description: '유튜브 기반 음악 플레이어 EOMpotify',
  generator: 'v0.app',
  icons: {
    icon: [{ url: '/eompotify-icon.svg', type: 'image/svg+xml' }],
    apple: '/eompotify-icon.svg',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#121212',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`dark ${inter.variable} ${notoKr.variable}`}>
      <body className="eompotify-body bg-[#121212] text-white antialiased h-full flex flex-col overflow-x-hidden min-h-screen">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
