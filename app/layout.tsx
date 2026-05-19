import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import BottomNav from '@/components/BottomNav'
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import ThemeProvider from '@/components/ThemeProvider'
import FloatingChat from '@/components/FloatingChat'
import OnboardingGate from '@/components/OnboardingGate'
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
  title: 'Frame',
  description: 'Body composition coaching, powered by AI',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Frame',
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
          <OnboardingGate />
          <ServiceWorkerRegistration />
          <PwaInstallPrompt />
          <main className="lg:max-w-2xl lg:mx-auto">
            {children}
          </main>
          <BottomNav />
          <FloatingChat />
        </ThemeProvider>
      </body>
    </html>
  )
}
