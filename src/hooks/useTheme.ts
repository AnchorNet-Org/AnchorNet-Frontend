"use client";

import { useContext } from "react";
import { ThemeContext, ThemeContextValue } from "@/components/ThemeProvider";

/** Accesses the theme context. Must be used within a `ThemeProvider`. */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
