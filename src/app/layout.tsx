import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IELTS Coach - Kiro Style",
  description: "Practice IELTS writing and speaking tasks with AI evaluation - Powered by Kiro",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
        >
          <ThemeProvider>
            <header className="flex justify-end items-center p-4 gap-4 h-16 border-b border-purple-500/20">
              <SignedOut>
                <SignInButton>
                  <button className="border border-purple-500 text-purple-400 hover:bg-purple-600 hover:text-white rounded-full font-semibold text-sm px-4 py-2 transition-all">
                    Sign In
                  </button>
                </SignInButton>
                <SignUpButton>
                  <button className="kiro-button-primary rounded-full font-semibold text-sm px-4 py-2">
                    Sign Up
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <UserButton 
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10",
                      userButtonPopoverCard: "bg-gray-900 border border-purple-500/30",
                      userButtonPopoverActionButton: "text-white hover:bg-purple-600",
                    }
                  }}
                />
              </SignedIn>
            </header>
            {children}
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
