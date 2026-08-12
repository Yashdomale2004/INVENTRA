import { motion, useReducedMotion } from "framer-motion";
import { Activity, BarChart3, Boxes, ClipboardList, ListChecks, Phone, PackagePlus, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { BLUE, BORDER, CARD_BG, EASE_OUT, MUTED, NAVY, PAGE_BG } from "./theme";

/** Fade-up-and-unblur entrance, triggered once when a section scrolls into
 * view. IntersectionObserver-backed (via whileInView), so it costs nothing
 * while off-screen — no continuous scroll listeners. Plain helper (not a
 * hook) so it can be called per-item inside a `.map()`; callers get the
 * `reduced` flag from their own top-level `useReducedMotion()` call. */
function reveal(reduced: boolean | null, delay = 0) {
  if (reduced) return {};
  return {
    initial: { opacity: 0, y: 28, filter: "blur(6px)" },
    whileInView: { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.7, delay, ease: EASE_OUT },
  };
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span
      className="mx-auto flex w-fit items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
      style={{ backgroundColor: "rgba(255,255,255,0.7)", borderColor: BORDER, color: BLUE }}
    >
      {children}
    </span>
  );
}

const CAPABILITIES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Boxes, title: "Inventory management", body: "Track every size and colour variant in real time across your stock." },
  { icon: PackagePlus, title: "Stock Up", body: "Log incoming stock the moment it arrives, ready to allocate." },
  { icon: ClipboardList, title: "Enquiry & order management", body: "Move enquiries through the full order workflow without losing detail." },
  { icon: ListChecks, title: "Order status tracking", body: "See exactly where every order stands, from new to delivered." },
  { icon: Truck, title: "Parcel tracking", body: "Match tracking numbers straight back to the order they belong to." },
  { icon: Activity, title: "Stock health visibility", body: "Get ahead of low-stock alerts before they become a problem." },
  { icon: BarChart3, title: "Dashboard insights", body: "One view of stock, orders, and parcels working together." },
];

export function ProductSection() {
  const reduced = useReducedMotion();

  return (
    <section id="product" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28" style={{ backgroundColor: PAGE_BG }}>
      <div className="mx-auto max-w-6xl">
        <motion.div {...reveal(reduced)} className="mx-auto max-w-2xl text-center">
          <Eyebrow>Product</Eyebrow>
          <h2 className="mt-5 font-serif text-[clamp(1.75rem,3.6vw,2.75rem)] leading-tight" style={{ color: NAVY }}>
            Built around how apparel stock actually moves.
          </h2>
          <p className="mt-4 text-sm sm:text-base" style={{ color: MUTED }}>
            INVENTRA is an inventory and parcel-tracking management system built for T-shirt and apparel
            businesses — not a storefront, an internal operations tool for keeping stock, orders, and
            shipments under control.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((capability, i) => (
            <motion.div
              key={capability.title}
              {...reveal(reduced, 0.05 * i)}
              className="rounded-2xl border p-6 shadow-[0_10px_30px_-18px_rgba(22,119,255,0.3)] transition-colors hover:bg-white"
              style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(22,119,255,0.12)", color: BLUE }}>
                <capability.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-bold" style={{ color: NAVY }}>
                {capability.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: MUTED }}>
                {capability.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  const reduced = useReducedMotion();

  return (
    <section id="about" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28" style={{ backgroundColor: "#ffffff" }}>
      <motion.div {...reveal(reduced)} className="mx-auto max-w-2xl text-center">
        <Eyebrow>About</Eyebrow>
        <h2 className="mt-5 font-serif text-[clamp(1.75rem,3.6vw,2.75rem)] leading-tight" style={{ color: NAVY }}>
          About INVENTRA
        </h2>
        <p className="mt-5 text-sm leading-relaxed sm:text-base" style={{ color: MUTED }}>
          INVENTRA is built to simplify inventory operations for T-shirt and apparel businesses. From stock
          management and enquiries to order status and parcel tracking, INVENTRA keeps everything organized
          in one place so teams can know what they have, what is moving, and what needs attention.
        </p>
      </motion.div>
    </section>
  );
}

export function SupportSection() {
  const reduced = useReducedMotion();

  return (
    <section id="support" className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-28" style={{ backgroundColor: PAGE_BG }}>
      <motion.div
        {...reveal(reduced)}
        className="mx-auto flex max-w-xl flex-col items-center gap-5 rounded-[2rem] border px-6 py-14 text-center shadow-[0_20px_50px_-24px_rgba(22,119,255,0.3)]"
        style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
      >
        <Eyebrow>Support</Eyebrow>
        <h2 className="font-serif text-[clamp(1.6rem,3.2vw,2.25rem)] leading-tight" style={{ color: NAVY }}>
          Need help with INVENTRA?
        </h2>
        <p className="max-w-md text-sm sm:text-base" style={{ color: MUTED }}>
          Our support team is available to help with setup, account access and product-related questions.
        </p>
        <a
          href="tel:8483030945"
          className="mt-2 flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-12px_rgba(22,119,255,0.55)] transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677FF]/50"
          style={{ backgroundColor: BLUE }}
        >
          <Phone className="h-4 w-4" />
          8483030945
        </a>
      </motion.div>
    </section>
  );
}

function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <section id={id} className="scroll-mt-24 px-5 py-20 sm:px-8 sm:py-24" style={{ backgroundColor: "#ffffff" }}>
      <motion.div
        {...reveal(reduced)}
        className="mx-auto max-w-3xl rounded-[2rem] border p-6 sm:p-10"
        style={{ backgroundColor: CARD_BG, borderColor: BORDER }}
      >
        <h2 className="font-serif text-[clamp(1.6rem,3.2vw,2.25rem)] leading-tight" style={{ color: NAVY }}>
          {title}
        </h2>
        <div className="mt-6 space-y-5 text-sm leading-relaxed sm:text-[15px]" style={{ color: MUTED }}>
          {children}
        </div>
      </motion.div>
    </section>
  );
}

function LegalHeading({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-bold" style={{ color: NAVY }}>
      {children}
    </h3>
  );
}

export function PrivacyPolicySection() {
  return (
    <LegalSection id="privacy-policy" title="Privacy Policy">
      <p>
        This policy explains what information INVENTRA processes and how it&apos;s used. INVENTRA is an
        internal inventory and parcel-tracking tool, and information is collected only to operate the
        service for the businesses that use it.
      </p>

      <div>
        <LegalHeading>Information we process</LegalHeading>
        <ul className="mt-2 list-disc space-y-1.5 pl-5">
          <li>Account information, such as your name and username.</li>
          <li>Authentication information needed to sign you in securely.</li>
          <li>Inventory, stock, and order information that you or your team enter into the system.</li>
          <li>Shipping or address information you choose to provide for parcel tracking.</li>
          <li>Basic technical information necessary to operate and secure the service, such as device and session data.</li>
        </ul>
      </div>

      <div>
        <LegalHeading>How it&apos;s used</LegalHeading>
        <p className="mt-2">
          Information is used to operate, secure, and improve INVENTRA — for example, keeping your stock and
          order records accurate, protecting your account, and diagnosing issues. We do not sell your
          information to third parties.
        </p>
      </div>

      <div>
        <LegalHeading>Questions</LegalHeading>
        <p className="mt-2">
          For questions about this policy, contact support at{" "}
          <a href="tel:8483030945" className="font-semibold" style={{ color: BLUE }}>
            8483030945
          </a>
          .
        </p>
      </div>
    </LegalSection>
  );
}

export function TermsSection() {
  return (
    <LegalSection id="terms" title="Terms of Service">
      <div>
        <LegalHeading>Appropriate use</LegalHeading>
        <p className="mt-2">
          INVENTRA is provided for authorized use in managing inventory, orders, enquiries, and parcel
          tracking. Use the service only for these legitimate business purposes.
        </p>
      </div>

      <div>
        <LegalHeading>Account responsibility</LegalHeading>
        <p className="mt-2">
          You&apos;re responsible for keeping your login credentials secure and for activity that happens
          under your account. Report suspected unauthorized access right away.
        </p>
      </div>

      <div>
        <LegalHeading>Your information</LegalHeading>
        <p className="mt-2">
          You&apos;re responsible for the accuracy of inventory, order, and tracking information you enter
          into INVENTRA. The service reflects what your team records.
        </p>
      </div>

      <div>
        <LegalHeading>Prohibited use</LegalHeading>
        <p className="mt-2">
          Don&apos;t misuse the service — including attempting to disrupt it, accessing data you&apos;re not
          authorized to see, or using it for anything unlawful.
        </p>
      </div>

      <div>
        <LegalHeading>Service availability</LegalHeading>
        <p className="mt-2">
          We aim to keep INVENTRA available and reliable, but the service is provided as-is and availability
          isn&apos;t guaranteed at all times.
        </p>
      </div>

      <div>
        <LegalHeading>Contact</LegalHeading>
        <p className="mt-2">
          Questions about these terms or support issues can be directed to{" "}
          <a href="tel:8483030945" className="font-semibold" style={{ color: BLUE }}>
            8483030945
          </a>
          .
        </p>
      </div>
    </LegalSection>
  );
}

const FOOTER_LINKS = [
  { label: "Product", href: "#product" },
  { label: "About", href: "#about" },
  { label: "Support", href: "#support" },
  { label: "Privacy Policy", href: "#privacy-policy" },
  { label: "Terms of Service", href: "#terms" },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t px-5 py-12 sm:px-8" style={{ backgroundColor: PAGE_BG, borderColor: BORDER }}>
      <div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="Inventra logo" className="h-7 w-7 object-contain" />
            <span className="text-xs font-black tracking-[0.28em]" style={{ color: NAVY }}>
              INVENTRA
            </span>
          </Link>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: MUTED }}>
            Inventory and parcel intelligence for T-shirt and apparel businesses.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6 sm:justify-end">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
              Company
            </p>
            {FOOTER_LINKS.map((link) => (
              <a key={link.label} href={link.href} className="text-sm transition-colors hover:opacity-70" style={{ color: MUTED }}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: NAVY }}>
              Support
            </p>
            <a href="tel:8483030945" className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-70" style={{ color: MUTED }}>
              <Phone className="h-3.5 w-3.5" />
              8483030945
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-6xl flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row" style={{ borderColor: BORDER }}>
        <p className="text-xs" style={{ color: MUTED }}>
          &copy; {new Date().getFullYear()} INVENTRA. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
