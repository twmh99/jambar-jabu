"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      storageKey="padsi-theme"
    >
      {children}
    </NextThemesProvider>
  );
}
