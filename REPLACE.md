# What's left

Everything on the page is now real, pulled from `jl26__ML_.pdf`. Nothing below
is a blocker for showing someone the site locally, but each one makes it better.

## Screenshots — the biggest remaining gap

Both project slabs render a striped placeholder well instead of an image. This
is the most visible unfinished thing on the page.

- **Clinical Intervention Simulator** — 21:9. The Streamlit app is the obvious
  shot. A wide crop of the dashboard, or the Tableau view.
- **ChessBlitz** — 16:10. The teacher classroom dashboard.

To swap one in: drop the file in `public/`, then replace

```html
<div class="project__well" data-slot="screenshot">
  <span class="well__label">Screenshot · 16:10</span>
</div>
```

with

```html
<img class="project__well" src="/chessblitz.png"
     alt="ChessBlitz teacher dashboard showing a classroom roster" />
```

Crop to the stated ratio or it will letterbox.

## Links

Both **Source** links point at `github.com/jynlee7`, your profile, because I
don't have the individual repo URLs. Narrow them to the actual repos when you
can — a hiring manager who clicks expects to land on the code.

## Third project

The layout already supports one. There's an unused `.pair` grid in `style.css`
that puts two half-width project slabs side by side — that's the arrangement if
you want Clinical Intervention Simulator featured with two smaller ones beneath.

## Nice to have before you share the link

- **Open Graph image.** No unfurl card yet, so pasting the link into Slack or
  LinkedIn shows plain text. Worth a 1200×630 image.
- **The résumé PDF is a copy.** `public/resume.pdf` was copied from
  `~/berk/jl26__ML_.pdf` on 24 Jul 2026. Re-copy when you update the original;
  it will not sync on its own.
- **Phone number** is on the résumé but deliberately not on the page. Add it if
  you want recruiters calling directly.

## Deliberately not done

Deployment. No Vercel config, no domain, no analytics — you asked to stay local.
