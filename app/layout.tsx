import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Trinetray Workspace',
  description: 'A focused workspace for tasks, communication and team coordination.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Trinetray Workspace',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
