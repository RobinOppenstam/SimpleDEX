import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEX - Decentralized Exchange",
  description: "Simple DEX built with Next.js and Ethers.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}