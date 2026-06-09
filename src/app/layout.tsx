import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PI Client Hub',
  description: 'Personal Injury Client Management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
