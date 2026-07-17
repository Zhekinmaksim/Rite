import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rite',
  description: 'Ordered audit records committed to Ritual Chain as verifiable Merkle roots.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <body>
      <header className="site-header">
        <div className="shell header-inner">
          <Link href="/" className="brand">Rite</Link>
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
