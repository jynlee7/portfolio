# Portfolio redesign proposal

Status: proposed, awaiting Jayden's approval. Prepared 2 October 2026.

This document is a plan, not an approved replacement for DESIGN.md. No application
code has been changed for this proposal. Implementation and testing agents start
only after approval. Jayden clarified that “deploy the harnesses” means launching
those agents, not publishing the website.

## Outcome

A visitor should understand who Jayden is, see evidence of his work, and reach the
résumé without learning an interface. The first visit should feel like exploring
a contemporary visual portfolio. Deeper interactions reward curiosity.

Primary audience: recruiters and engineers scanning for 30–90 seconds, including
on a phone. Success means the résumé is one click away from the first viewport,
project summaries are visible without opening anything, and project details take
one deliberate click.

## What the review found

- The live desktop at jaydenelee.com devotes most of its area to wallpaper. Small
  file icons reveal neither the projects' purpose nor their strongest evidence.
- The entry screen adds a step before reaching work. Menus, icons, and a dock
  provide several navigation systems for the same small amount of content.
- The local design contract explicitly says “A machine you operate, not a page
  you scroll.” The requested redesign changes that central requirement.
- `src/main.ts` does not initialize the existing command palette or status
  modules. Adding search would help shortcuts, but would not fix the hierarchy.
- Both main projects currently use screenshot placeholders. Real screenshots
  are absent from `public/`; the design cannot assume they will become available.
- The project uses Vite and vanilla TypeScript. Magic UI's published components
  are React components, so they cannot be dropped into this site unchanged.
- The working tree on `feature/rift-exe` contains substantial pre-existing edits
  and untracked game modules. Production and the working tree also differ.
  Implementation must preserve both the current work and its provenance.

Evidence: live browser inspection at 1440px and 390px; `index.html`, `src/main.ts`,
`src/tokens.css`, `DESIGN.md`, `PRODUCT.md`, `CLAUDE.md`, and `TODO.md`.

## Recommended experience

Make the portfolio the default homepage. Retain the desktop as an optional
experience reached through Playground, with an obvious return to the portfolio.

```text
Jayden Lee            Work    Experience    Playground    [Résumé]

Jayden Lee / Machine learning and data science
One specific sentence about the work, based on existing copy
[View selected work]  [Download résumé]         interactive contour field

Selected work
┌────────────────────────────────┬───────────────────────────┐
│ Clinical Intervention         │ ChessBlitz                │
│ Simulator                     │ Teaching platform         │
│ Large visual / method preview │ Chess / classroom concept │
│ 1st place · 300 scenarios     │ Berkeley Chess School     │
│ [Explore project] [Open app]   │ [Explore project] [Source]│
└────────────────────────────────┴───────────────────────────┘
This website — smaller project entry and link to its interactive desktop

Experience — roles, organizations, dates, and a visible takeaway per role
About — brief introduction and existing skills
Playground — deliberate entry to desktop, spots.map, and rift.exe
Contact — email, GitHub, LinkedIn, résumé
```

The sketch expresses hierarchy, not an approved pixel layout. On a typical
desktop, the first viewport should contain the identity, résumé action, and
enough of the featured work to make exploration obvious. On a phone, identity
and actions come first, then the first project within roughly one screen of scroll.

### Discovery and navigation

- Replace the default lock screen, desktop icon navigation, dock, and widget rail
  with ordinary page navigation. Their retained home is the optional desktop.
- Show all three projects. Three items do not justify filters or a search box.
- Use human-readable labels: Work, Experience, About, Playground, Résumé.
- Each project exposes what it does, evidence, and its available external link
  before interaction. Hover never holds essential information.
- Project details expand inline as semantic disclosures with a visible close
  action and stable anchor. Preserve existing `/#clinical`, `/#chessblitz`,
  `/#site`, `/#experience`, `/#about`, and `/#resume` links. A direct project
  hash opens the corresponding disclosure; browser Back restores navigation.
- Make the PDF a normal direct link. A visitor does not need to open a simulated
  window to download it.
- Keep command search outside the initial scope. If the content grows, the
  existing palette can be integrated as a secondary shortcut.

## Visual direction and component references

Use the site's scientific subject matter as its visual identity: a large,
interactive contour field paired with readable project evidence. Keep Cabinet
Grotesk and Switzer, use cool near-white reading surfaces, dark ink, and the
existing indigo as the primary action color. Replace beveled OS panels with
cleaner project frames, generous spacing, and a much stronger type hierarchy.

Proposed scale: 64–88px display type on wide screens, 40–48px on phones,
16–18px body text, and comfortable 65–75-character reading widths. Project
frames may use 16–24px corners; buttons use smaller corners. These are proposals
to replace the current 3–5px workstation rules, not silent exceptions to them.

| Reference | Proposed use | Purpose and boundary |
| --- | --- | --- |
| [Magic UI Bento Grid](https://magicui.design/docs/components/bento-grid) | Unequal project spans in the selected-work area | Make the strongest work visibly lead; each project has a distinct composition |
| [Magic UI Magic Card](https://magicui.design/docs/components/magic-card) | Restrained pointer response within project artwork | Signal that a project can be explored; focus receives an equally clear treatment |
| [Magic UI Blur Fade](https://magicui.design/docs/components/blur-fade) | Brief entrance for artwork and secondary details | Establish order without delaying headings, résumé actions, or readable content |
| Existing `src/field/core.ts` and `src/os/flow.ts` | Interactive contour feature | Preserve an interaction specific to this portfolio; adapt the existing math |

These references describe patterns to adapt, not a commitment to install the
entire library. [Magic UI installation](https://magicui.design/docs/installation)
uses the shadcn component workflow; its source examples use React.

### Project visuals

- Clinical Simulator: an explanatory progression from patient scenarios through
  simulation and model to intervention. A small “Explore the method” control
  reveals each stage. Diagrams explain the documented architecture; they are
  labeled illustrations and must not imply measured outcomes or a working
  medical recommendation tool.
- ChessBlitz: a chess-position illustration and existing classroom-use evidence.
  If an example interaction is included, label it as an illustration, not an
  actual product screenshot or a live AI integration.
- This website: the real contour interaction and a deliberate entry to the
  existing desktop. The site itself supplies the demonstration.
- If verified screenshots become available, use them. Until then, remove blank
  screenshot wells from the primary reading path and use clearly identified
  explanatory artwork. Keep missing screenshot needs in TODO.md.

The implementation should begin with the contour and project interaction, then
add only the motion that helps reading or exploration. Avoid stacking unrelated
effects simply because the library offers them.

## Mobile, motion, and interaction states

At 320–767px, use a single reading column with Work and Résumé always visible in
the header, and an accessible menu for the remaining destinations. Project
summary, evidence, and action stay visible together. Details open in page flow.
At 768–1023px, use a compact two-column showcase only where the text remains
comfortable. At 1024px and above, use the asymmetric showcase and wider spacing.

| Situation | Visitor-visible behavior |
| --- | --- |
| Initial load | Identity, links, and summaries render as HTML immediately; artwork has reserved space |
| Project collapsed / expanded | The summary stays visible; a labeled disclosure exposes or hides the technical story |
| Artwork loading or failing | A static, locally supplied illustration remains; project text and actions still work |
| Reduced motion | Static contour artwork, immediate disclosures, and no entrance effects |
| Touch | All actions work by tap; pointer effects are absent and reveal no exclusive content |
| JavaScript unavailable | The portfolio remains readable and navigable with native links and disclosures |
| Résumé preview unavailable | A normal PDF link remains available; preview is not required |
| Playground loading / unavailable | Show a loading state or retry link with a persistent return to the portfolio |
| Incomplete personal content | Preserve the existing draft treatment inside Playground; do not promote it as finished work |

Motion targets: 140–220ms control feedback, at most 300ms for optional art reveals,
no animation prerequisite for seeing content. The field stops when idle,
offscreen, reduced-motion is enabled, or the tab is hidden. Games start only on
deliberate interaction and stop or pause on exit.

Provide keyboard access, semantic landmarks, visible focus, screen-reader labels,
44px minimum primary touch targets, verified AA contrast, and a 200% zoom check.
Use ordinary scrolling. The contour must never compromise text contrast.

## Implementation approach after approval

Keep Vite and vanilla TypeScript. Implement the selected patterns with CSS,
small TypeScript modules, and the existing field renderer. This is the
recommended technical choice for this small static portfolio; direct React
component installation would require a separately scoped framework migration.

1. Preserve a complete baseline of the dirty working tree, including untracked
   files, before branching or assigning agents. A worktree made only from HEAD
   would omit current work. Do not reset, clean, stash away, or overwrite it.
2. Update DESIGN.md, the relevant PRODUCT.md design commitments, and CLAUDE.md to
   record the approved hierarchy and visual system. Keep factual content intact;
   known résumé/date discrepancies remain explicit rather than being guessed.
3. Establish a dedicated `/desktop/` entry for the retained OS using Vite's
   multipage build. Isolate its styles and startup from the homepage, and lazy
   load its game code. Read GAME.md and RIFT.md before changing integration.
4. Extract shared project content into build-time partials so the homepage and
   retained desktop draw facts from one source. Serve complete HTML; no runtime
   content request is needed. Preserve the desktop's move-not-clone behavior.
5. Build the homepage hierarchy, native project disclosures, deep-link handling,
   résumé/contact paths, and responsive layouts.
6. Integrate the field and project artwork with lifecycle cleanup, static
   fallbacks, and reduced-motion behavior. Replace legacy main-page selectors
   rather than letting OS styles leak into the portfolio.
7. Produce a local preview and screenshots for review, run the acceptance checks,
   and fix verified regressions. Publishing is a separate step.

## Agent assignments

These assignments are proposed and have not been launched. At most three
subagents run alongside the coordinating agent.

| Owner | Scope | Boundary / handoff |
| --- | --- | --- |
| Coordinating agent | Baseline, approved contracts, shared content, entry points, integration | Owns `index.html`, shared tokens, build config, and final integration |
| Layout agent | Homepage presentation, responsive navigation, project disclosures | Works in agreed new portfolio modules/styles; proposes shared-file changes to coordinator |
| Interaction agent | Contour integration and project artwork behavior | Owns separate effects modules/assets; no parallel edits to shell or shared tokens |
| Testing agent | Independent acceptance checks and browser evidence | Starts by writing behavior-based checks, then exercises the integrated preview; reports defects before fixes are assigned |

Establish DOM and event contracts before parallel implementation. Give each agent
the same approved plan and preserved baseline. If isolated worktrees are used,
include the pre-existing local work in the baseline. Keep shared-file edits with
one owner and integrate dependent changes sequentially.

## Acceptance checks

- `npm run build` passes; run the repository's Impeccable detector on changed UI.
- A fresh visit shows the portfolio without an entry gesture or restored windows.
- The résumé takes one click from desktop and mobile first viewports.
- All project summaries are readable without clicking, searching, or hovering.
- Project details, direct hashes, reload, browser Back, and external links work.
- Check 320, 390, 768, 1024, and 1440px widths, 200% zoom, and no horizontal
  overflow. Verify mobile tap behavior independently of a resized desktop view.
- Check keyboard-only navigation, focus order, accessible names, contrast, native
  disclosures, no-JS rendering, and reduced motion. Use browser emulation for
  reduced-motion and touch settings, with a real-device pass where available.
- Verify desktop mode's return link and the existing game launch/pause/close paths;
  preserve each game's documented touch limitations rather than claiming new support.
- Compare production-build initial JS and assets against a preserved baseline;
  the new homepage must not eagerly load the desktop or game bundles. Record
  loading and layout stability measurements rather than promising unmeasured scores.
- Test image failure and confirm that text and actions remain usable. No added
  analytics, third-party embeds, invented links, claims, or credentials.

## Approval requested

Approve or revise the proposed homepage hierarchy, visual direction, component
adaptation in the existing stack, and agent work plan. The central recommendation
is to move the OS experience into optional Playground access. Keeping the OS as
the default would need a different plan centered on a visible work overview.

Only this proposal document was added. No implementation agents, test agents,
application changes, installs, commits, pushes, or website deployments were
performed for this redesign.
