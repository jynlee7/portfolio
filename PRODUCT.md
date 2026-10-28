# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: hiring managers, engineering managers, and technical recruiters
evaluating a UC Berkeley student for an internship or new-grad engineering
role. They are scanning quickly, often on a phone, often with a stack of other
candidates open in adjacent tabs. Their job is to answer one question fast —
*is this person worth a call?* — and then find the resume PDF to forward
internally.

Secondary: engineers who get pulled in for a second opinion and will actually
click through to the code.

## Product Purpose

A personal portfolio site that earns a callback. Success is a hiring manager
reaching the resume download or a project link within the first screen or two,
with enough specific evidence that they can justify the interview to someone
else.

## Positioning

The owner is a UC Berkeley student with AI, full-stack, and backend experience.
The site's differentiator is specificity and craft: real shipped projects with
live URLs, and professional work described concretely, rather than a template
listing skills as logo grids. The site itself is the first work sample.

## Operating Context

Evaluated in a browser tab for 30–90 seconds, frequently on mobile, frequently
alongside a resume PDF and a GitHub profile. Often reached from a LinkedIn or
resume header link. May be opened on a shared screen during a hiring debrief.

## Capabilities and Constraints

- Static site. Vite build, deployed to Vercel.
- Canonical URL is `jaydenelee.com` — the apex, with `www` redirecting to it.
  One URL, because it gets pasted into a resume header and a LinkedIn field
  and those must not disagree.
- Must be genuinely fast and legible on a phone.
- Resume PDF is a first-class destination, not a footer afterthought.

## Brand Commitments

The user supplied `lovi.care` as a binding visual reference. Its transferable
DNA, confirmed from source: display type set with line-height below font-size
and heavy negative tracking; oversized corner radii (40–64px) on section-level
slabs; multi-stop shadow ramps with negative spread; staggered scroll reveals
on a `cubic-bezier(.12,.23,.28,.98)` curve with 1200px perspective.

Explicit constraint from the user: the result must not read as AI-generated.

## Evidence on Hand

**Source of truth: `content/portfolio.mjs`**, compiled into the desktop's
documents and the wall's sign at build time. Its source of record is
`public/resume.pdf`, a copy of `JaydenLeeResume.pdf` (dated 26 Oct 2026),
shipped on 28 Oct 2026. Re-copy on update; it does not sync.
`scripts/test-portfolio.mjs` checks the copy byte-for-byte and checks every
role's organisation and title on the desktop's experience log.

As of that résumé: B.A. Data Science, Applied Mathematics emphasis, UC
Berkeley, GPA 3.7, expected May 2028. Five roles — SwingVision (Data Analyst
Intern, Sep 2026–present), CalCompute, MatX (AI Software Engineer, contract),
Cal Athletics (contract), PNNL — and three projects: Lea (LiDAR Enabled
Assistant), Foresight (the Clinical Intervention Simulator), and this website.
bearings and ChessBlitz stay on the desktop from earlier résumés.

The 26 Oct résumé changed two claims, and the site follows it: SwingVision is
"100+ hours of sports data" with no percentage (the earlier "50%" and "50+
hours" are gone), and CalCompute no longer counts sources and references.

The August-era notes that used to be here ("MatX is gone", "Nothing is
currently active", Oakland Roots, the Now widget's one line) are **superseded**
by the October résumés. They are preserved in `docs/PRODUCT_HISTORY.md`; do not
restore any of them from there without a résumé that says so.

## Product Principles

1. **Specific beats impressive.** A real number from real work outranks any
   adjective. Where a number is unknown, leave the slot visible rather than
   filling it with a claim.
2. **The scan path is the design.** Name, what they do, proof, resume — reachable
   without scrolling on desktop and within one thumb-flick on mobile.
3. **The site is a work sample.** Every interaction is evidence of craft, so
   nothing ships half-finished or janky.
4. **Never fabricate.** Placeholder content stays obviously placeholder until
   the user replaces it.

## Accessibility & Inclusion

Keyboard reachable throughout, visible focus states, WCAG AA contrast on all
body text, and full respect for `prefers-reduced-motion` — the reveal
choreography must degrade to plain static content.
