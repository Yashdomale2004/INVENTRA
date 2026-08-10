import { useEffect, useState } from "react";

// Matches Tailwind's default `lg` breakpoint, used throughout the app to
// distinguish desktop-only UI/behavior from the mobile experience.
const DESKTOP_QUERY = "(min-width: 1024px)";

export function useIsDesktopViewport(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const handleChange = () => setIsDesktop(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}
