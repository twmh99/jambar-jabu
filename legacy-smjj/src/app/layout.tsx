import "./globals.css";
import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "SMJJ",
  description: "SMJJ Management App",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" suppressHydrationWarning={true}>
      <body className="bg-gray-50 text-gray-900 dark:bg-[#0b0b0b] dark:text-gray-100 transition-colors duration-300">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
