import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "QuickVoice | Real-Time AI Speech Translation",
    template: "%s | QuickVoice",
  },
  description: "Experience real-time AI voice interpretation between English and Japanese conversations. Private, local, and secure.",
  keywords: [
    "AI translation",
    "live interpretation",
    "English to Japanese",
    "Japanese to English",
    "speech-to-text",
    "local AI model",
    "privacy-first translation",
  ],
  authors: [{ name: "QuickVoice Team" }],
  creator: "QuickVoice",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "QuickVoice",
    title: "QuickVoice | Break The Language Barrier Instantly",
    description: "Real-time AI voice interpretation between English and Japanese. Built for privacy with local AI models.",
    images: [
      {
        url: "/logo-d.png",
        width: 1200,
        height: 630,
        alt: "QuickVoice - Live AI Translation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuickVoice | Break The Language Barrier Instantly",
    description: "Real-time AI voice interpretation between English and Japanese. Built for privacy with local AI models.",
    creator: "@quickvoice",
    images: ["/logo-d.png"],
  },
};
import { SettingsProvider } from "@/context/SettingsContext";
import { AuthProvider } from "@/context/AuthContext";
import AppChrome from "@/components/AppChrome";
import ReloadOnStaleBuild from "@/components/ReloadOnStaleBuild";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')`,
          }}
        />
      </head>
      <body className="h-full flex flex-col">
        <SettingsProvider>
          <AuthProvider>
            <ReloadOnStaleBuild />
            <AppChrome />
            {/* shrink-0, and no min-h-0. A flex child's automatic minimum size
                is the only thing keeping tall pages at their natural height
                here: adding min-h-0 to let one page bound itself squashed the
                landing page's four-step conversation section from 240vh to a
                single screen, with its heading colliding with the nav. Pages
                that want to fill the window and scroll inside size themselves
                against --appbar-h instead -- see PageShell. */}
            <div className="flex flex-1 shrink-0 flex-col">{children}</div>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
