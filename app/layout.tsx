import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import ThemeProvider from '@/components/ThemeProvider'
import FloatingChat from '@/components/FloatingChat'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Body Composition Copilot',
  description: 'Personal body recomposition dashboard',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BCC',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0d14',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
  try {
    var t = localStorage.getItem('bcc-theme') || 'dark';
    var a = localStorage.getItem('bcc-accent') || 'blue';
    var d = document.documentElement;
    if (t === 'auto') t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    d.setAttribute('data-theme', t);
    d.setAttribute('data-accent', a);
  } catch(e) {}
` }} />
      </head>
      <body className="min-h-full bg-page text-ink antialiased">
        <ThemeProvider>
          <ServiceWorkerRegistration />
          <PwaInstallPrompt />
          {children}
          <BottomNav />
          <FloatingChat />
        </ThemeProvider>
      </body>
    </html>
  )
}
