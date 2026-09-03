import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Translation App",
  description: "Break the language barrier instantly with QuickVoice. One-way live broadcasts, two-way conversations, and smart recording organization.",
  openGraph: {
    title: "QuickVoice | Live Translation App",
    description: "Break the language barrier instantly with QuickVoice. One-way live broadcasts, two-way conversations, and smart recording organization.",
    url: "/landing",
  },
  twitter: {
    title: "QuickVoice | Live Translation App",
    description: "Break the language barrier instantly with QuickVoice. One-way live broadcasts, two-way conversations, and smart recording organization.",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
