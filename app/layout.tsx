import type { Metadata, Viewport } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import ThemeParticles from "@/components/ThemeParticles";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "YTG - Family Gaming Platform",
  description:
    "A fun, colorful family gaming platform for kids ages 3+. Play games, earn XP, and level up!",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YTG",
    startupImage: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#f0f7ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="blue-light" suppressHydrationWarning>
      <head>
        {/* Inline script to apply saved theme before first paint (prevents flash) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme && ['blue-light','blue-dark','red-light','red-dark'].includes(theme)) {
                    document.documentElement.setAttribute('data-theme', theme);
                    var colors = {
                      'blue-light': '#f0f7ff',
                      'blue-dark': '#0f172a',
                      'red-light': '#fff5f5',
                      'red-dark': '#1a0a0a'
                    };
                    var meta = document.querySelector('meta[name="theme-color"]');
                    if (meta) meta.setAttribute('content', colors[theme]);
                  }
                } catch(e) {}
              })();
              // Register service worker for offline support
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${fredoka.variable} font-body antialiased`}
        style={{ minHeight: "100vh" }}
      >
        {/* Decorative background particles */}
        <ThemeParticles />

        {/* Main layout: sticky nav + scrollable content */}
        <div className="relative z-10 flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
