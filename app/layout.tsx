import type { Metadata } from 'next';
import './globals.css';
import './workspace-enhancements.css';
import ThemeToggle from '@/components/theme-toggle';

export const metadata: Metadata = {
  title: 'Trinetray Workspace',
  description: 'A focused workspace for tasks, communication and team coordination.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Trinetray Workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="theme-control"><ThemeToggle /></div>
        {children}
      </body>
    </html>
  );
}
