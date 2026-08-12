import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * React Router doesn't reset scroll position on navigation (unlike a full
 * page load). Without this, clicking "Get Started" while scrolled down the
 * landing page lands on /login at that same scroll offset, so the new page
 * appears to jump in mid-way instead of starting at the top.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
