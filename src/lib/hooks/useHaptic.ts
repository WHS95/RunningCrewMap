"use client";

export function useHaptic() {
  const trigger = (style: "light" | "medium" | "heavy" = "light") => {
    if (!navigator.vibrate) return;
    const durations = { light: 10, medium: 20, heavy: 30 };
    navigator.vibrate(durations[style]);
  };

  return { trigger };
}
