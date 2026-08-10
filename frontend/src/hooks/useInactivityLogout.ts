import { useEffect, useRef } from "react";

import { useAuth } from "../contexts/AuthContext";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Reset events fire on both desktop (mouse/keyboard/wheel) and mobile (touch/scroll)
// interactions, so the timeout behaves the same on every device.
const ACTIVITY_EVENTS = ["mousedown", "mousemove", "keydown", "wheel", "touchstart", "scroll"] as const;
// mousemove/scroll can fire dozens of times a second — only actually reschedule
// the logout timer this often, since sub-second precision on a 30-minute
// timeout is pointless and rescheduling on every event is wasted work.
const RESCHEDULE_THROTTLE_MS = 5000;

/**
 * Signs the user out after INACTIVITY_TIMEOUT_MS with no interaction anywhere
 * in the app. ProtectedRoute already redirects to /login as soon as
 * `isAuthenticated` flips to false, so this hook only needs to call `logout`.
 */
export function useInactivityLogout() {
  const { isAuthenticated, logout } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRescheduleRef = useRef(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    const scheduleLogout = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        logout().catch((error) => console.error("[useInactivityLogout] auto logout failed", error));
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRescheduleRef.current < RESCHEDULE_THROTTLE_MS) return;
      lastRescheduleRef.current = now;
      scheduleLogout();
    };

    scheduleLogout();
    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
    };
  }, [isAuthenticated, logout]);
}
