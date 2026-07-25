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
- No domain purchased yet — will run on a `.vercel.app` subdomain initially,
  so the URL itself carries no signal and the page must.
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

Owner is **Jayden Lee** — jeyl@berkeley.edu, github.com/jynlee7,
linkedin.com/in/jynlee7. B.A. Data Science and B.A. Computer Science at UC
Berkeley, GPA 3.63.

Source of record: `~/berk/jl26__ML_.pdf`, copied to `public/resume.pdf`
on 24 Jul 2026. Re-copy on update; it does not sync.

Roles, all real and on the page:

- Machine Learning Researcher, Cal Athletics (contract), Feb 2026–present
- Machine Learning Consultant, MatX (contract), Dec 2025–present — leads 8 engineers
- Business Analyst, Oakland Roots Sports Club (contract), Sep–Dec 2025
- Modeling & Simulation Intern, Pacific Northwest National Laboratory, Jun 2024–May 2025
- Computational Biology Intern, Pacific Northwest National Laboratory, Jun–Aug 2023

Projects, both real:

- **Clinical Intervention Simulator** — 1st place, 7th Annual Datathon at
  Berkeley, over 50 teams and 200+ participants. Monte Carlo over 300 patient
  scenarios, Random Forest, Streamlit.
- **ChessBlitz** — open source, in use at Berkeley Chess School. Flask,
  Supabase, OpenRouter, React.

Hard numbers available and used: 300,000+ mass-spec files, 18 metaproteomics
datasets, 36 MGF spectral files, 300 patient scenarios, 8 engineers led.

**Still absent:** project screenshots, per-repo GitHub URLs, an OG image, and a
third project. Do not invent any of them. There are no live deployed URLs for
either project, so the page links to source only.

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
