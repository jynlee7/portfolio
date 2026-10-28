import { statSync } from "node:fs";
import { profile, roles, projects, archiveProjects } from "../content/portfolio.mjs";

const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
const paragraph = (text) => `<p>${esc(text)}</p>`;
const row = (key, value) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`;

const MONTHS = { Jan: "January", Feb: "February", Mar: "March", Apr: "April", May: "May", Jun: "June", Jul: "July", Aug: "August", Sep: "September", Oct: "October", Nov: "November", Dec: "December" };

/** "Sep 2026 — Present" → "September 2026": when a role's period began. */
function since(period) {
  const [month, year] = period.split(" — ")[0].split(" ");
  return [MONTHS[month] ?? month, year].filter(Boolean).join(" ");
}

/**
 * The desktop's two mentions of the current role — the nameplate's status
 * line and the Now widget — rendered at `<!-- @portfolio-part id -->` markers
 * from the role content/portfolio.mjs marks current, so changing it in
 * content/portfolio.mjs changes them too. With no current role both render
 * nothing, rather than keep calling a finished one current.
 */
export function renderDesktopPart(id) {
  const current = roles.find((role) => role.current);
  if (id === "status") {
    return current ? `<p class="nameplate__status">
          <span class="dot" aria-hidden="true"></span>
          Currently at ${esc(current.organization)}
        </p>` : "";
  }
  if (id === "now") {
    return current ? `<div class="widget widget--now">
          <p class="widget__title">Now</p>
          <ul class="nowlist">
            <li>
              <span class="nowlist__what">${esc(current.title)}</span>
              <span class="nowlist__where">${esc(current.organization)}</span>
            </li>
          </ul>
          <p class="widget__foot">Since ${esc(since(current.period))}.</p>
        </div>` : "";
  }
  throw new Error(`Unknown desktop part: ${id}`);
}

export function renderDesktopDoc(id) {
  if (id === "about") {
    return `<article class="doc" id="doc-about" data-title="about.txt" data-meta="plain text">
      <h2 class="doc__h1">${esc(profile.name)}</h2>
      <p class="doc__lede">${esc(profile.introduction)}</p>
      <p>${esc(roles[0].title)} at ${esc(roles[0].organization)}. ${esc(roles[0].summary)}</p>
      <dl class="spec">${row("Study", `${profile.degree}, ${profile.emphasis} emphasis, UC Berkeley`)}
      ${row("Degree", `Expected ${profile.graduation}`)}${row("GPA", profile.gpa)}
      ${Object.entries(profile.skills).map(([key, value]) => row(key, value)).join("")}
      ${row("Activities", profile.activities.join(" · "))}
      <div><dt>Mail</dt><dd><a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a></dd></div>
      <div><dt>Code</dt><dd><a href="${esc(profile.github)}">GitHub profile</a></dd></div></dl></article>`;
  }
  if (id === "experience") {
    return `<article class="doc" id="doc-experience" data-title="experience.log" data-meta="${roles.length} entries">
      <h2 class="doc__h1">Experience</h2><ol class="roles">${roles.map((role) => `<li class="role">
      <p class="role__when num">${esc(role.period)}</p><h3 class="role__title">${esc(role.title)}</h3>
      <p class="role__org">${esc(role.organization)} · ${esc(role.location)}</p>${role.paragraphs.map(paragraph).join("")}</li>`).join("")}</ol>
      <div class="edu"><p><strong>${esc(profile.degree)}</strong>, ${esc(profile.emphasis)} emphasis,
      UC Berkeley · GPA <span class="num">${profile.gpa}</span> · expected ${esc(profile.graduation)}</p>
      <p>${esc(profile.activities.join(" · "))}</p></div></article>`;
  }
  if (id === "resume") {
    const size = Math.round(statSync("public/resume.pdf").size / 1024);
    return `<article class="doc doc--pdf" id="doc-resume" data-title="resume.pdf" data-meta="PDF · ${size} KB">
      <div class="pdf"><object class="pdf__view" data="/resume.pdf#view=FitH" type="application/pdf">
      <div class="pdf__fallback"><p>Your browser won't preview PDFs inline.</p>
      <a class="btn btn--primary" href="/resume.pdf" download>Download résumé</a></div></object></div>
      <div class="pdf__bar"><dl class="pdf__meta">${row("Kind", "PDF document")}${row("Size", `${size} KB`)}${row("Pages", "1")}</dl>
      <a class="btn btn--primary" href="/resume.pdf" download>Download résumé</a></div></article>`;
  }
  const project = [...projects, ...archiveProjects].find((project) => project.id === id);
  if (!project) throw new Error(`Unknown desktop document: ${id}`);
  const title = id === "clinical" ? "clinical-sim" : id === "site" ? "this-site" : id;
  return `<article class="doc" id="doc-${esc(id)}" data-title="${esc(title)}" data-meta="project">
    <h2 class="doc__h1">${esc(project.name)}</h2><p class="doc__lede">${esc(project.description || project.summary)}</p>
    ${project.paragraphs.map(paragraph).join("")}<dl class="spec">${row("Stack", project.stack.join(" · "))}
    ${project.links.map((link) => `<div><dt>${esc(link.label)}</dt><dd><a href="${esc(link.href)}">${esc(link.label)}</a></dd></div>`).join("")}</dl></article>`;
}
