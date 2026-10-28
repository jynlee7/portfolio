import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderDoc } from "./scripts/doc.mjs";
import { renderPortfolio } from "./scripts/portfolio.mjs";
import { renderDesktopDoc, renderDesktopPart } from "./scripts/desktop-docs.mjs";

/** Documents written as prose rather than markup. id → source file. */
const WRITTEN = {
  // principles.txt is OFF the shipped page as of 25 Aug 2026, because
  // content/principles.md is still the scaffold — "Replace this lede with two
  // or three sentences", and a WORKFLOW section addressed to Jayden. That text
  // was live on jaydenelee.com for nineteen days. A document that tells a
  // hiring manager how to write itself is worse than no document.
  //
  // Nothing was deleted: the prose file, the `@doc principles` marker in
  // index.html, and the window width in src/os/windows.ts all stay put. With
  // no entry here the marker compiles to nothing and the article never exists,
  // so the palette (which reads the DOM) drops it too.
  //
  // To bring it back once the file is real: uncomment this line and the two
  // launchers in index.html marked with the same date. Nothing else.
  // principles: "content/principles.md",
};

/**
 * Compile the written documents into index.html at its `<!-- @doc id -->`
 * markers.
 *
 * Injecting at build time rather than fetching at runtime keeps the site's one
 * rule about content intact: there is exactly one copy of every fact in the
 * DOM, the windowed view and the no-JS page read from the same element, and a
 * visitor with JavaScript off still gets the whole document.
 */
function writtenDocs() {
  const sources = Object.values(WRITTEN).map((p) => resolve(p));

  return {
    name: "written-docs",

    transformIndexHtml: {
      order: "pre",
      handler(html) {
        for (const [id, path] of Object.entries(WRITTEN)) {
          const marker = new RegExp(`[ \\t]*<!--\\s*@doc ${id}\\s*-->`);
          if (!marker.test(html)) continue;

          if (!existsSync(path)) {
            this.warn?.(`written-docs: ${path} is missing; skipping ${id}`);
            continue;
          }

          const { article, warnings } = renderDoc(readFileSync(path, "utf8"), id);
          for (const warning of warnings) {
            console.warn(`\n  ${path}: ${warning}\n`);
          }
          html = html.replace(marker, article);
        }

        return html;
      },
    },

    // Editing the prose should reload the page the same way editing the markup
    // does. Vite is not watching content/ on its own, because nothing in the
    // module graph imports it.
    configureServer(server) {
      for (const path of sources) server.watcher.add(path);
      server.watcher.on("change", (file) => {
        if (!sources.includes(file)) return;
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}

export default {
  plugins: [
    {
      name: "shared-portfolio-content",
      transformIndexHtml: {
        order: "pre",
        handler(html) {
          if (html.includes("<!-- @portfolio -->")) {
            html = html.replace("<!-- @portfolio -->", renderPortfolio());
          }
          return html
            .replace(/<!--\s*@portfolio-doc ([\w-]+)\s*-->/g, (_marker, id) => renderDesktopDoc(id))
            .replace(/<!--\s*@portfolio-part ([\w-]+)\s*-->/g, (_marker, id) => renderDesktopPart(id));
        },
      },
    },
    writtenDocs(),
  ],
  build: {
    rolldownOptions: {
      input: { portfolio: resolve("index.html"), desktop: resolve("desktop/index.html") },
    },
  },
};
