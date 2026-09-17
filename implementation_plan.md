# Judgeman — Full Website Expansion Plan

## Overview

Expand Judgeman from a single-page app into a **3-page full-fledged website** with proper navigation, authentication gating, and a marketing landing page.

---

## Page Architecture

```
/ (index.html)     → Public Landing Page      [No auth required]
/auth.html         → Login / Sign Up Page     [Public]
/app.html          → Main AI Workspace        [Auth gated — redirect to /auth.html if not logged in]
```

---

## Page 1: Landing Page (`index.html`) — Full Redesign

A high-impact marketing page to wow visitors and drive sign-ups.

### Sections
1. **Sticky Navbar** — Logo, nav links (Features, How It Works, Pricing, About), Login + Get Started CTAs
2. **Hero Section** — Bold headline, animated gradient text, short subtitle, dual CTA buttons (Get Started Free + Watch Demo), floating frosted mockup card with animated contract preview
3. **Social Proof Strip** — "Trusted by X+ users" with animated counters: Documents Analyzed, Clauses Flagged, Users, Countries
4. **Features Showcase** (6 feature cards in a bento grid):
   - Plain Language Simplifier
   - Contract Comparison Diff
   - Risk & Clause Radar
   - Interactive AI Q&A Chat
   - Lawyer Prep Kit Export
   - Gemini AI Powered
5. **How It Works** — 3-step animated timeline with illustrations
6. **Use Cases** — Cards for: Individual/Renters, Freelancers, Startups, Small Businesses
7. **Testimonials** — Frosted testimonial cards with avatar initials
8. **CTA Banner** — "Start analyzing your first contract free" with email input
9. **Footer** — Logo, links, socials, legal disclaimer

---

## Page 2: Auth Page (`auth.html`) — Login + Sign Up

A beautiful frosted glass dual-mode auth page.

### Features
- Frosted glass card centered on the atmospheric gradient background
- **Tabbed switching** between Login and Sign Up with smooth animation
- **Sign Up form**: Full Name, Email, Password, Confirm Password + Terms checkbox
- **Login form**: Email + Password + Remember Me + Forgot Password link
- **Client-side validation** with animated error/success states
- **Mock auth engine** using `localStorage`:
  - Sign Up → stores hashed (simple) user data in `localStorage` → redirects to `/app.html`
  - Login → validates against stored users → redirects to `/app.html`
  - App page checks for auth on load → redirects to `/auth.html` if not logged in
- Google Sign-In button (UI only, styled placeholder)
- Visual password strength meter on sign-up

---

## Page 3: App Workspace (`app.html`) — Current + Auth Gate

Move the existing `index.html` workspace to `app.html` with:
- **Auth guard**: Check `localStorage` for session → redirect to `/auth.html` if absent
- **User avatar/name** shown in top-right nav (pulled from stored profile)
- **Logout button** that clears session and redirects to landing page
- All existing modules intact: Overview, Simplifier, Comparison, Risk Radar, Chat, Prep Kit

---

## Design Consistency

All three pages share:
- Same CSS design token system (glassmorphism, colors, fonts)
- Same ambient background orbs
- Same `Outfit` + `Inter` + `JetBrains Mono` typography
- Same line-art SVG iconography

---

## File Changes

```
c:/Legal Assitance/
├── index.html          ← [MODIFY] Full marketing landing page
├── auth.html           ← [NEW] Login / Sign-up page
├── app.html            ← [NEW] Current workspace moved here + auth gate
├── style.css           ← [MODIFY] Add landing page sections + auth form styles
└── js/
    ├── app.js          ← [MODIFY] Add auth guard + user display + logout
    ├── auth.js         ← [NEW] Auth logic (login, signup, validation, session)
    ├── landing.js      ← [NEW] Landing page animations (counters, scroll effects)
    ├── icons.js        ← [no change]
    ├── sampleData.js   ← [no change]
    └── geminiService.js← [no change]
```

---

## Verification Plan

- Launch Vite dev server, open `http://localhost:5173/`
- Verify landing page sections render correctly
- Navigate to `/auth.html`, sign up with a test account
- Confirm redirect to `/app.html` after successful signup
- Confirm logout redirects to `/index.html`
- Confirm accessing `/app.html` without session redirects to `/auth.html`
- Verify all pages are responsive on mobile viewport
