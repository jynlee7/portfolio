# Product

<!-- impeccable:product-schema 1 -->

> **Frozen snapshot of `PRODUCT.md`, 2 Oct 2026**, taken before the portfolio
> became the homepage. Its "Evidence on Hand" is the August résumé and is out
> of date; the live facts are in `content/portfolio.mjs`.

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

Owner is **Jayden Lee** — jeyl@berkeley.edu, github.com/jynlee7,
linkedin.com/in/jynlee7. B.A. Data Science at UC Berkeley with a domain
emphasis in applied mathematics, GPA 3.7, expected May 2028. Head of Business,
Sports Analytics Group at Berkeley.

Source of record: `jl26.pdf`, supplied 6 Aug 2026 and copied to
`public/resume.pdf`. Re-copy on update; it does not sync.

Roles, all real and on the page:

- Data Analyst, Cal Athletics (contract), Feb–May 2026
- Business Analyst, Oakland Roots Sports Club (contract), Sep–Dec 2025
- Modeling & Simulation Intern, Pacific Northwest National Laboratory, Jun 2024–May 2025
- Computational Biology Intern, Pacific Northwest National Laboratory, Jun–Aug 2023

**Nothing is currently active**, as of the Aug 2026 résumé. The `Now` widget
therefore carries exactly one line — **Head of Business, Sports Analytics
Group at Berkeley** — and dates the last contract in its foot. The degree came
out of it on 19 Aug 2026 at Jayden's direction: it is a fact about him, not a
post he holds, and it is already in `about.txt` and `experience.log`. Do not
restore a "both current" framing, and do not pad the widget back to two lines,
without a second role that is actually running.

**MatX is gone.** The Dec 2025 ML Consultant contract — 8 engineers, LLM
training benchmarks, decode efficiency metrics — was on the July résumé and is
absent from this one. Removed from the page on 6 Aug 2026 at Jayden's
direction. It was the site's only leadership evidence, so if it comes back it
needs an end date and a move out of the present tense.

Projects, all real:

- **Clinical Intervention Simulator** — 1st place, 7th Annual Datathon at
  Berkeley, over 50 teams and 200+ participants. Monte Carlo over 300 patient
  scenarios, Random Forest, Streamlit.
- **ChessBlitz** — open source, in use at Berkeley Chess School. Flask,
  Supabase, OpenRouter, React.
- **This website** — added 6 Aug 2026, when the résumé started listing it.
  Multi-agent development in Claude Code, agents in isolated git worktrees,
  written specs, a Keep a Changelog release log, every change gated behind the
  TypeScript build and an accessibility pass. It is the one project a reader
  can audit without leaving the page, so it must never claim more than the
  repository actually contains.

Hard numbers available and used: 300,000+ mass-spec files, 36 MGF spectral
files, 300 patient scenarios. The "18 bacterial metaproteomics datasets"
figure came off the page on 19 Aug 2026: the Aug 2026 résumé does not make
that claim, and nothing else Jayden wrote supports it. Do not restore it
without a document that does.

Each role also carries the **takeaway** its résumé entry ends with, in
Jayden's own words and verbatim apart from punctuation. They are the one place
on this page where he is allowed to sound like a person rather than a record,
which is exactly why they may not be paraphrased, polished, or invented for a
role whose résumé entry has none.

Tools named by Jayden on 26 Jul 2026: **Claude, Stitch, Gemini, VS Code,
Git**. These are the tools he works *in*, which is a different list from the
technologies on the résumé's Skills line and from the per-project `Stack`
rows. Do not merge the three, and do not add a sixth tool he has not named.
The label `Tools` in `about.txt` is reserved for this list; the row is not on
the page today, since the floating tray that used to hold it was removed and
nothing replaced it.

The résumé's own Skills section landed in `about.txt`'s spec table on 19 Aug
2026 as four rows — `Languages`, `Modeling`, `Toolchain`, `Speaks` — carrying
that section verbatim. `Toolchain` is deliberately not called `Tools`, so the
two lists cannot be quietly merged later. `Speaks` (English, Korean) is split
out of the résumé's Languages line, which runs the two together behind one em
dash.

**Still absent:** project screenshots, per-repo GitHub URLs, and an OG image.
Do not invent any of them. There are no live deployed URLs for the two built
projects, so the page links to source only.

`principles.txt` exists as a scaffold in `content/principles.md` and is marked
`Draft: yes`. Jayden writes it; do not write his principles for him. Formatting,
trimming and structure are the help to give once there is real text there.

**It is not on the page as of 25 Aug 2026.** The scaffold shipped to production
and was public for nineteen days, telling readers to "replace this lede". A
document whose live text is instructions for writing it is worse than no
document, so it is hidden — not deleted — until the prose is real. Three
commented-out lines restore it; `TODO.md` names them. The rule this sets: a
`Draft: yes` document may exist in the repo and may ship to preview, but it
does not ship to `jaydenelee.com` unless, like `spots.map`, the draft state is
itself something the reader can see working.

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
