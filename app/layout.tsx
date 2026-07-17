import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rite',
  description: 'Multi-agent audit workflows as verifiable onchain receipts on Ritual Chain.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en">
    <body>
      <header className="site-header">
        <div className="shell header-inner">
          <Link href="/" className="brand">Rite</Link>
          <span className="chain">rite ledger · Ritual Chain 1979</span>
        </div>
      </header>
      <main className="shell page-shell">{children}</main>
      <footer className="site-footer">
        <div className="shell footer-copy">performed in order · witnessed · sealed · break the order and the rite is void</div>
      </footer>
    </body>
  </html>
}
