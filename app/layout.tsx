import type { Metadata } from "next";
import { Geist, Geist_Mono, Nunito } from "next/font/google";
import type { ReactNode } from "react";

import { AuthProvider } from "@/components/auth-provider";
import { BoardAppearanceProvider } from "@/components/board-appearance-provider";
import { PrefsCloudSync } from "@/components/prefs-cloud-sync";
import { ReviewPrefsProvider } from "@/components/review-prefs-provider";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { THEME_BOOT_SCRIPT } from "@/lib/theme";
import { SCHOOL } from "@/lib/school";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: SCHOOL.name,
  description: SCHOOL.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="cs"
      suppressHydrationWarning
      className={`dark ${geistSans.variable} ${geistMono.variable} ${nunito.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="relative flex h-dvh flex-col bg-background font-sans text-foreground">
        <ThemeProvider>
          <AuthProvider>
            <BoardAppearanceProvider>
              <ReviewPrefsProvider>
                <PrefsCloudSync />
                <SiteHeader />
                {children}
              </ReviewPrefsProvider>
            </BoardAppearanceProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
