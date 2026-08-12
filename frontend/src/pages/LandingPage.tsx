import { useReducedMotion } from "framer-motion";
import { Navigate } from "react-router-dom";

import { CinematicHero } from "../components/landing/CinematicHero";
import { LandingNav } from "../components/landing/LandingNav";
import {
  AboutSection,
  FinalCtaSection,
  PrivacyPolicySection,
  ProductSection,
  SiteFooter,
  SupportSection,
  TermsSection,
} from "../components/landing/LandingSections";
import { PAGE_BG } from "../components/landing/theme";
import { useAuth } from "../contexts/AuthContext";

export function LandingPage() {
  const { isAuthReady, isAuthenticated } = useAuth();
  const prefersReducedMotion = useReducedMotion();

  if (isAuthReady && isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden" style={{ backgroundColor: PAGE_BG }}>
      <LandingNav />
      <CinematicHero prefersReducedMotion={!!prefersReducedMotion} />
      <ProductSection />
      <AboutSection />
      <SupportSection />
      <PrivacyPolicySection />
      <TermsSection />
      <FinalCtaSection />
      <SiteFooter />
    </div>
  );
}
