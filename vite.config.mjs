import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { renderDoc } from "./scripts/doc.mjs";

/** Documents written as prose rather than markup. id → source file. */
const WRITTEN = {
  principles: "content/principles.md",
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
  plugins: [writtenDocs()],
};
