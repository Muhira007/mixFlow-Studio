import type { Metadata, Viewport } from 'next';
import { AppProvider } from '@/contexts/AppContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { ToastContainer } from '@/components/shared/Toast';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'mixFlow — AI Video Editor for Affiliate',
  description:
    'Aplikasi all-in-one untuk content creator affiliate: AI Script Generator + Video Editor dengan TTS dan adaptive trim otomatis.',
  icons: { icon: '/favicon.ico' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a14',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased" suppressHydrationWarning>
      <body className="h-full flex overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AppProvider>
            <MainLayout>
              {children}
            </MainLayout>
            <ToastContainer />
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
