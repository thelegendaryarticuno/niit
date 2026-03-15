import type { Metadata } from "next";
import "./globals.css";
import {
  sharedExternalScripts,
  sharedInlineScripts,
  sharedStyleBlocks,
  sharedStylesheets,
} from "@/lib/generated/niit-site-data";

export const metadata: Metadata = {
  title: "NIIT University",
  description: "Next.js recreation of extracted NIIT University pages.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-US">
      <head>
        {sharedStylesheets.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {sharedStyleBlocks.map((css, index) => (
          <style
            key={`inline-style-${index}`}
            dangerouslySetInnerHTML={{ __html: css }}
          />
        ))}
      </head>
      <body>
        {sharedInlineScripts.map((script) => (
          <script
            key={script.key}
            id={script.id ?? undefined}
            dangerouslySetInnerHTML={{ __html: script.code }}
          />
        ))}
        {children}
        {sharedExternalScripts.map((src) => (
          <script key={src} src={src} />
        ))}
      </body>
    </html>
  );
}
