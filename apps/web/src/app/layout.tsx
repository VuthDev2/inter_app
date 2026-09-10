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
            {/* shrink-0 keeps tall pages (the landing page especially) at their
                natural height instead of being squashed to fit the window.
                min-h-0 is what lets a page ask for the opposite: without it a
                flex child may not go below its content height, so a page trying
                to be a fixed frame with a scrolling list inside just grew, and
                the list never scrolled. Together they mean each page chooses --
                grow, or fill and scroll inside. */}
            <div className="flex min-h-0 flex-1 shrink-0 flex-col">{children}</div>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
