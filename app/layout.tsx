import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lead CRM',
  description: 'Find local businesses with no website and turn them into web design clients.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="border-b bg-white">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
              <Link href="/" className="font-semibold text-lg">
                Lead CRM
              </Link>
              <nav className="flex gap-4 text-sm">
                <Link href="/" className="hover:underline">
                  Pipeline
                </Link>
                <Link href="/search" className="hover:underline">
                  Find Leads
                </Link>
                <a href="/api/leads/export" className="hover:underline">
                  Export CSV
                </a>
              </nav>
            </div>
          </header>
          <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
