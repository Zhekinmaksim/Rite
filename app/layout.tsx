import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rite | Verifiable agent work',
  description: 'Performed in order. Witnessed. Sealed.'
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>
}
