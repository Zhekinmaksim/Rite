import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

const siteUrl = 'https://rite-proof-trail.vercel.app'
const description = 'Ordered audit records committed to Ritual Chain as verifiable Merkle roots.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Rite',
  description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/brand/favicon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/brand/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'Rite',
    description,
    url: siteUrl,
    siteName: 'Rite',
    images: [
      {
        url: '/brand/og-card.png',
        width: 1200,
        height: 630,
        alt: 'Rite: verifiable rites of agent work',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rite',
    description,
    creator: '@0maxxdev',
    images: ['/brand/og-card.png'],
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <body>
      <header className="site-header">
        <div className="shell header-inner">
          <Link href="/" className="brand" aria-label="Rite home">
            <img className="brand-mark" src="/brand/logo-mark.svg" alt="" />
            <span>Rite</span>
          </Link>
          <nav className="top-links" aria-label="Project links">
            <a href="https://github.com/Zhekinmaksim/Rite" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://x.com/0maxxdev" target="_blank" rel="noreferrer">X / 0maxxdev</a>
            <span className="chain">Ritual Chain · 1979</span>
          </nav>
        </div>
      </header>
      <main className="shell page-shell">{children}</main>
      <footer className="site-footer">
        <div className="shell footer-copy">
          <span>ordered evidence · wallet signed · Merkle committed</span>
          <span className="footer-links">
            <a href="https://github.com/Zhekinmaksim/Rite" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://x.com/0maxxdev" target="_blank" rel="noreferrer">@0maxxdev</a>
          </span>
        </div>
      </footer>
    </body>
  </html>
}
