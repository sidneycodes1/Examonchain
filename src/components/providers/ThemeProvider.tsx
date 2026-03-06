"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/themeStore";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.remove("light");
    if (theme === "light") document.documentElement.classList.add("light");
  }, [theme]);

  return <>{children}</>;
}
