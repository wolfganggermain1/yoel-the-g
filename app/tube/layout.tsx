import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import './tube.css';

const roboto = Roboto({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-roboto',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'YTG Tube',
  description: 'Parent-approved videos and YTG games in one place. Designed by Areli.',
};

export default function TubeLayout({ children }: { children: React.ReactNode }) {
  return <div className={roboto.variable}>{children}</div>;
}
