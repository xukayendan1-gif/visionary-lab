import React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Toaster } from "@/components/ui/sonner";

type RootLayoutProps = {
  children: React.ReactNode
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Visionary Lab",
  description: "AI-powered Content Generation",
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <head />
      <body className="overflow-hidden">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Main layout with sidebar */}
          <div className="relative flex min-h-screen h-screen">              
            {/* Content area with sidebar */}
            <SidebarProvider
              style={
                {
                  "--sidebar-width": "12rem",
                } as React.CSSProperties
              }
              className="flex h-full w-full"
            >
              {/* Sidebar for navigation */}
              <AppSidebar />
              <SidebarInset className="flex-1 flex flex-col h-full w-full">
                <div className="flex h-14 items-center gap-2 border-b shrink-0 px-3">
                  <SidebarTrigger />
                  <Separator orientation="vertical" className="mx-2 h-4" />
                </div>
                <main className="flex-1 overflow-auto w-full transition-all duration-200">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          </div>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
