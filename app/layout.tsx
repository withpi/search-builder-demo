import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { SearchProvider } from "@/lib/search-context"
import "./globals.css"
import { Suspense } from "react"

export const metadata: Metadata = {
  title: "Search Builder",
  description: "Demo platform for search engine technologies",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={<div>Loading...</div>}>
          <SearchProvider>{children}</SearchProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
