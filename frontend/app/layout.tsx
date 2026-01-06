import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cedar Agent Admin Dashboard",
  description: "Admin dashboard for managing Cedar policies, entities, and schemas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inject runtime configuration from environment variables
  // Next.js replaces NEXT_PUBLIC_* vars at build time, so we need to read
  // from runtime process.env in server components
  // Use RUNTIME_API_BASE_URL for runtime override, fallback to NEXT_PUBLIC_API_BASE_URL
  const runtimeBaseUrl = typeof process !== 'undefined' 
    ? (process.env.RUNTIME_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8280/v1')
    : 'http://localhost:8280/v1';
  
  const runtimeApiKey = typeof process !== 'undefined'
    ? (process.env.RUNTIME_API_KEY || process.env.NEXT_PUBLIC_API_KEY || '')
    : '';

  const runtimeConfig = {
    baseUrl: runtimeBaseUrl,
    apiKey: runtimeApiKey,
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__RUNTIME_CONFIG__ = ${JSON.stringify(runtimeConfig)};`,
          }}
        />
        <Providers>
          <SidebarProvider>
            <AppSidebar />
            <main className="w-full">
              {children}
            </main>
          </SidebarProvider>
        </Providers>
      </body>
    </html>
  );
}
