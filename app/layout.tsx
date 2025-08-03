import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EventFlow - Smart Event Planning for Fitness Coaches',
  description: 'AI-powered event planning platform designed specifically for fitness coaches',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          {children}
        </div>
      </body>
    </html>
  );
} 