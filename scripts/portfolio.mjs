import { profile, roles, projects, archiveProjects } from '../content/portfolio.mjs';

const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const arrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5 19 19 5M5 5h14v14" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const downArrow = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M12 4v16m-7-7 7 7 7-7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const asterisk = '<svg class="asterisk" aria-hidden="true" viewBox="0 0 100 100" fill="none"><path d="M50 5v90M5 50h90M18.2 18.2l63.6 63.6M18.2 81.8l63.6-63.6" stroke="currentColor" stroke-width="12"/></svg>';

const sceneDescriptions = {
  tennis: 'Illustrative three-dimensional tennis court, racket, and ball',
  knowledge: 'Illustrative three-dimensional network of research and knowledge',
  compute: 'Illustrative three-dimensional computing and model evaluation system',
  stadium: 'Illustrative three-dimensional stadium and fan data',
  protein: 'Illustrative three-dimensional molecular structure and mass spectra',
  transit: 'Illustrative three-dimensional Berkeley exploration map',
  simulation: 'Illustrative three-dimensional clinical simulation paths',
  field: 'Illustrative three-dimensional contour field',
};

function scene(kind, extraClass = '') {
  return `<figure class="scene scene--${escape(kind)} ${extraClass}">
    <div class="scene__mount" data-scene="${escape(kind)}" role="img" aria-label="${escape(sceneDescriptions[kind])}">
      <img class="scene__fallback" src="/scenes/${escape(kind)}.svg" alt="" width="800" height="600" />
    </div>
    <figcaption class="scene__caption">
      <span>Interactive illustration</span>
      <span class="scene__controls">
        <button type="button" data-scene-rotate="left" aria-label="Rotate illustration left">←</button>
        <button type="button" data-scene-reset aria-label="Reset illustration">↺</button>
        <button type="button" data-scene-rotate="right" aria-label="Rotate illustration right">→</button>
      </span>
    </figcaption>
  </figure>`;
}

function links(items, className = 'text-link') {
  return items.map(({ label, href }) => `<a class="${className}" href="${escape(href)}">${escape(label)}${arrow}</a>`).join('');
}

function projectNotes(project) {
  return `<details id="${escape(project.id)}" class="project-details">
    <summary><span>Behind the build</span><span class="disclosure-mark" aria-hidden="true">+</span></summary>
    <div class="project-details__body">
      ${project.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}
      <p class="project-stack"><span>Built with</span>${escape(project.stack.join(' · '))}</p>
    </div>
  </details>`;
}

function projectCard(project, index) {
  return `<article class="project project--${escape(project.id)}">
    ${scene(project.scene, 'project__scene')}
    <div class="project__copy">
      <div class="project__heading"><h3>${escape(project.name)}</h3><span>${escape(project.category)}</span></div>
      <p class="project__summary">${escape(project.summary)}</p>
      <p class="project__description">${escape(project.description)}</p>
      <p class="project__proof">${escape(project.proof)}</p>
      <div class="project__actions"><a class="text-link" href="#${escape(project.id)}">Explore project${arrow}</a>${links(project.links)}</div>
      ${projectNotes(project)}
    </div>
  </article>`;
}

function roleEntry(role, index) {
  return `<article class="role ${index % 2 ? 'role--reverse' : ''}" aria-labelledby="role-${escape(role.id)}">
    <div class="role__art">${scene(role.scene)}</div>
    <div class="role__body">
      <div class="role__meta"><span>${escape(role.period)}</span>${role.current ? '<span class="current-marker"><i aria-hidden="true"></i>Currently here</span>' : `<span>${escape(role.location)}</span>`}</div>
      <h3 id="role-${escape(role.id)}">${escape(role.shortName || role.organization)}</h3>
      ${role.shortName ? `<p class="role__full-name">${escape(role.organization)}</p>` : ''}
      <p class="role__title">${escape(role.title)}</p>
      <p class="role__summary">${escape(role.summary)}</p>
      <p class="role__proof">${escape(role.proof)}</p>
      <details class="role-notes">
        <summary><span>What I worked on</span><span class="disclosure-mark" aria-hidden="true">+</span></summary>
        <div class="role-notes__body">${role.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}<p class="role__tags">${escape(role.tags.join(' · '))}</p></div>
      </details>
    </div>
  </article>`;
}

function archiveProject(project) {
  return `<details id="${escape(project.id)}" class="project-details archive-project">
    <summary><span><span class="archive-project__label">Also on the workbench</span><strong>${escape(project.name)}</strong><span class="archive-project__summary">${escape(project.summary)}</span></span><span class="disclosure-mark" aria-hidden="true">+</span></summary>
    <div class="project-details__body">${project.paragraphs.map((paragraph) => `<p>${escape(paragraph)}</p>`).join('')}<p class="project-stack"><span>Built with</span>${escape(project.stack.join(' · '))}</p><div class="project__actions">${links(project.links)}</div></div>
  </details>`;
}

export function renderPortfolio() {
  const currentRole = roles.find((role) => role.current);
  return `<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="site-header__inner page-width">
      <a class="wordmark" href="#main" aria-label="Jayden Lee, home">jl<span aria-hidden="true">.</span></a>
      <nav class="portfolio-nav" id="portfolio-nav" aria-label="Main navigation">
        <a href="#experience">Experience</a><a href="#about">About</a><a href="#playground">Playground</a>
      </nav>
      <div class="header-actions"><a class="header-work" href="#work">Work</a><a class="header-resume" href="${escape(profile.resume)}">Résumé${arrow}</a><button class="menu-toggle" data-menu-toggle aria-controls="portfolio-nav" aria-expanded="false" type="button">Menu<span aria-hidden="true">+</span></button></div>
    </div>
  </header>
  <main id="main" tabindex="-1">
    <section class="hero page-width" aria-labelledby="hero-title">
      <div class="hero__copy">
        <p class="hero__discipline">${escape(profile.discipline)}</p>
        <h1 id="hero-title">${escape(profile.name)}<span class="hero__period">.</span></h1>
        <p class="hero__introduction">${escape(profile.introduction)}</p>
        <a class="hero__current" href="#experience"><span class="current-dot" aria-hidden="true"></span><span>${escape(currentRole.title)}<br><strong>at ${escape(currentRole.organization)}</strong></span>${arrow}</a>
        <div class="hero__actions"><a class="button button--primary" href="${escape(profile.resume)}" download>Download résumé${downArrow}</a><a class="text-link" href="#work">Explore my work${downArrow}</a></div>
      </div>
      <div class="hero__art"><div class="hero__art-note">A little spin on data.</div>${scene('tennis', 'hero__scene')}<p class="hero__art-footnote"><span class="hero__asterisk">${asterisk}</span>Curiosity, in every dimension.</p></div>
    </section>

    <section class="work-section section-space page-width" id="work" aria-labelledby="work-title">
      <div class="section-heading"><h2 id="work-title">Ideas, put to work<span>.</span></h2><p>Some things I've built.<br>From the useful to the playful.</p></div>
      <div class="project-grid">${projects.map(projectCard).join('')}</div>
      <div class="archive">${archiveProjects.map(archiveProject).join('')}</div>
    </section>

    <section class="experience-section section-space" id="experience" aria-labelledby="experience-title">
      <div class="page-width">
        <div class="section-heading"><h2 id="experience-title">Different fields.<br>Same curiosity<span>.</span></h2><p>Sports. Language models. Molecular data.<br>I like learning how things work.</p></div>
        <div class="role-list">${roles.map(roleEntry).join('')}</div>
      </div>
    </section>

    <section class="about-section section-space page-width" id="about" aria-labelledby="about-title">
      <div class="about__introduction"><div class="about__symbol">${asterisk}</div><h2 id="about-title">Always a student.</h2><p>I'm a junior at UC Berkeley studying Data Science with an emphasis in Applied Mathematics. I like the part where an interesting question becomes something you can actually use.</p><p>Outside of that: sports and esports, philosophy, travel, and metals and jewelry. A few different ways to stay curious.</p></div>
      <div class="about__details"><div class="education"><span class="education__label">On campus</span><h3>University of<br>California, Berkeley</h3><p>${escape(profile.degree)} · ${escape(profile.emphasis)}</p><p>Expected ${escape(profile.graduation)} · ${escape(profile.gpa)} GPA</p><p class="education__activities">${profile.activities.map(escape).join('<br>')}</p></div><div class="skills" aria-label="Skills">${Object.entries(profile.skills).map(([category, skills]) => `<details class="skill-details"><summary><span>${escape(category)}</span><span class="disclosure-mark" aria-hidden="true">+</span></summary><p>${escape(skills)}</p></details>`).join('')}</div></div>
    </section>

    <section class="playground-section section-space" id="playground" aria-labelledby="playground-title"><div class="page-width playground__inner">
      <div class="playground__intro"><p class="playground__note"><span aria-hidden="true">↳</span> Take a detour</p><h2 id="playground-title">Serious about<br>playing around<span>.</span></h2><p>The original desktop lives on. Open a window, move things around, or lose a few minutes to a game.</p><a class="button button--light" href="/desktop/">Enter the playground${arrow}</a></div>
      <div class="playground__objects" aria-label="Explore the playground"><a class="play-object play-object--map" href="/desktop/#spots"><span class="play-object__illustration" aria-hidden="true"><span class="map-tile map-tile--one"></span><span class="map-tile map-tile--two"></span><span class="map-tile map-tile--three"></span><span class="map-pin"></span></span><span class="play-object__text"><strong>spots.map</strong><span>A little world to explore</span></span>${arrow}</a><a class="play-object play-object--rift" href="/desktop/#rift"><span class="play-object__illustration" aria-hidden="true"><span class="rift-orbit rift-orbit--one"></span><span class="rift-orbit rift-orbit--two"></span><span class="rift-core"></span></span><span class="play-object__text"><strong>rift.exe</strong><span>Step into the game</span></span>${arrow}</a><p class="playground__input-note">Games are designed for a keyboard and pointer.</p></div>
    </div></section>

    <section class="contact-section section-space page-width" id="contact" aria-labelledby="contact-title"><div><p class="contact__intro">Have something in mind?</p><h2 id="contact-title">Let's make<br>something click<span>.</span></h2></div><div class="contact__links"><a class="contact__email" href="mailto:${escape(profile.email)}">${escape(profile.email)}${arrow}</a><div class="contact__socials"><a class="text-link" href="${escape(profile.github)}">GitHub${arrow}</a><a class="text-link" href="${escape(profile.linkedin)}">LinkedIn${arrow}</a><a class="text-link" id="resume" href="${escape(profile.resume)}" download>Download résumé${downArrow}</a></div></div></section>
  </main>
  <footer class="site-footer page-width"><p>© ${new Date().getFullYear()} ${escape(profile.name)}</p><p>Made with curiosity in Berkeley, CA.</p><a class="text-link" href="#main">Back to top<span aria-hidden="true">↑</span></a></footer>`;
}
