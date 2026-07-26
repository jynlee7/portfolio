/**
 * Markdown → document HTML.
 *
 * This exists so prose lives in a file a person can write in, not inside 25kB
 * of chrome markup. It is deliberately not a general Markdown implementation:
 * it understands exactly the shapes this site's documents are made of, and it
 * emits this project's own classes rather than bare tags, so a written
 * document is typeset by the same CSS as a hand-built one. Anything it does
 * not recognise stays a paragraph.
 *
 * Run through `vite.config.mjs` at build time. Nothing here ships to the
 * browser.
 *
 * The grammar:
 *
 *     Title: principles.txt      ← window title, then a blank line
 *     Meta: plain text           ← the grey text on the title bar
 *     Draft: yes                 ← renders a draft band, warns on build
 *
 *     # Document heading
 *     The first paragraph after it is the lede.
 *
 *     ## A principle
 *     — where this came from      ← the anchor line. See below.
 *     The prose for it.
 *
 *     - a bullet
 *
 * The anchor is the whole reason this format has a shape at all. A page of
 * principles fails in exactly one way: abstract nouns nobody can check. So
 * every `##` gets one line naming the real job, number or decision it came
 * out of, it renders in the accent where a job title's employer renders, and
 * leaving it out puts a visible gap in the page instead of quietly reading
 * fine.
 */

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const escape = (s) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

/** Straight marks are for source code. Prose gets the real ones. */
const typeset = (s) =>
  s
    .replace(/(\w)'(\w)/g, "$1’$2")
    .replace(/(^|[\s([])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s([])'/g, "$1‘")
    .replace(/'/g, "’")
    .replace(/\.\.\./g, "…")
    .replace(/(\s)-{2,}(\s)/g, "$1—$2");

/** Anything that is not plainly a web address is not going in an href. */
const safeHref = (url) =>
  /^(https?:\/\/|mailto:|\/|#)/i.test(url) ? url : "#";

function inline(raw) {
  // Code spans are split out first so neither typography nor markup can reach
  // inside them — a backticked path with an apostrophe in it stays literal.
  return raw
    .split(/(`[^`]*`)/)
    .map((part) => {
      if (part.length > 1 && part.startsWith("`") && part.endsWith("`")) {
        return `<code class="num">${escape(part.slice(1, -1))}</code>`;
      }
      return escape(typeset(part))
        .replace(
          /\[([^\]]+)\]\(([^)\s]+)\)/g,
          (_, text, url) => `<a href="${safeHref(url)}">${text}</a>`,
        )
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>");
    })
    .join("");
}

/** `Key: value` lines above the first blank line. */
function frontmatter(source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const meta = {};
  let i = 0;
  for (; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line === "") break;
    const match = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (!match) break;
    meta[match[1].toLowerCase()] = match[2].trim();
  }
  return { meta, body: lines.slice(i) };
}

/**
 * Render one document to an `<article class="doc">`, ready to be dropped into
 * the shelf in index.html. Returns the markup plus whatever the build should
 * complain about.
 */
export function renderDoc(source, id) {
  const { meta, body } = frontmatter(source);
  const warnings = [];
  const draft = /^(yes|true)$/i.test(meta.draft ?? "");

  const out = [];
  let tenet = null; // The principle currently being collected.
  let para = []; // Lines of the paragraph currently being collected.
  let bullets = null;
  let ledeNext = false;

  const push = (html) => (tenet ? tenet.body : out).push(html);

  const flushPara = () => {
    if (para.length === 0) return;
    const text = inline(para.join(" "));
    if (ledeNext && !tenet) {
      out.push(`<p class="doc__lede">${text}</p>`);
      ledeNext = false;
    } else {
      push(`<p>${text}</p>`);
    }
    para = [];
  };

  const flushBullets = () => {
    if (!bullets) return;
    const tag = bullets.ordered ? "ol" : "ul";
    push(
      `<${tag} class="bullets${bullets.ordered ? " bullets--num" : ""}">` +
        bullets.items.map((item) => `<li>${inline(item)}</li>`).join("") +
        `</${tag}>`,
    );
    bullets = null;
  };

  const flushTenet = () => {
    flushPara();
    flushBullets();
    if (!tenet) return;
    if (!tenet.anchor) {
      warnings.push(
        `"${tenet.title}" has no anchor line. Add a line starting with — naming the work it came from.`,
      );
    }
    out.push(
      `<li class="tenet">` +
        `<h3 class="tenet__title">${inline(tenet.title)}</h3>` +
        (tenet.anchor
          ? `<p class="tenet__anchor">${inline(tenet.anchor)}</p>`
          : `<p class="tenet__anchor tenet__anchor--missing">anchor missing</p>`) +
        tenet.body.join("") +
        `</li>`,
    );
    tenet = null;
  };

  for (const raw of body) {
    const line = raw.trim();

    if (line === "") {
      flushPara();
      flushBullets();
      continue;
    }

    // An anchor only means anything directly under its own principle, and only
    // before any prose has started.
    if (
      tenet &&
      !tenet.anchor &&
      tenet.body.length === 0 &&
      para.length === 0 &&
      /^(—|--)\s+/.test(line)
    ) {
      tenet.anchor = line.replace(/^(—|--)\s+/, "");
      continue;
    }

    if (line.startsWith("## ")) {
      flushTenet();
      tenet = { title: line.slice(3).trim(), anchor: "", body: [] };
      continue;
    }

    if (line.startsWith("# ")) {
      flushTenet();
      out.push(`<h2 class="doc__h1">${inline(line.slice(2).trim())}</h2>`);
      ledeNext = true;
      continue;
    }

    if (/^-{3,}$/.test(line)) {
      flushPara();
      flushBullets();
      push(`<hr class="doc__rule" />`);
      continue;
    }

    const bullet = line.match(/^([-*]|\d+\.)\s+(.*)$/);
    if (bullet) {
      flushPara();
      const ordered = bullet[1].endsWith(".");
      // A change of list style starts a new list rather than mixing markers.
      if (bullets && bullets.ordered !== ordered) flushBullets();
      bullets ??= { ordered, items: [] };
      bullets.items.push(bullet[2]);
      continue;
    }

    // A wrapped list item is still that item. Without this, hitting the wrap
    // column mid-bullet ends the list and restarts the numbering at 1.
    if (bullets) {
      bullets.items[bullets.items.length - 1] += ` ${line}`;
      continue;
    }

    para.push(line);
  }

  flushTenet();

  // Wrap the run of principles in one list. They are collected as <li> above,
  // so this is where they become a real list rather than loose blocks.
  const html = out
    .join("\n")
    .replace(
      /(<li class="tenet">[\s\S]*<\/li>)/,
      '<ul class="tenets">\n$1\n</ul>',
    );

  if (draft) {
    warnings.push(
      `still marked "Draft: yes" — the document renders with a draft band until that says no.`,
    );
  }

  const title = meta.title ?? id;
  const shelfMeta = draft ? "draft" : (meta.meta ?? "");

  const article =
    `<article class="doc" id="doc-${id}" data-title="${escape(title)}"` +
    ` data-meta="${escape(shelfMeta)}">\n` +
    (draft
      ? `<p class="draftbar">Draft. Not finished, and visible so it cannot be forgotten.</p>\n`
      : "") +
    html +
    `\n</article>`;

  return { article, warnings, draft };
}
