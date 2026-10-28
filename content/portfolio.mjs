/**
 * Portfolio facts. Primary source: Lee_Jayden_Resume_10202026.pdf, copied to
 * public/resume.pdf on 28 Oct 2026 (supersedes JaydenLeeResume.pdf of 2 Oct).
 * User additionally states: junior at UC Berkeley. No invented links or results.
 * Both the homepage and optional desktop compile this source into static HTML.
 */
export const profile = {
  name: "Jayden Lee",
  discipline: "Data science · UC Berkeley",
  introduction: "I'm a junior studying Data Science at UC Berkeley, working at the intersection of machine learning, software, and sport.",
  current: "Currently at SwingVision",
  email: "jeyl@berkeley.edu",
  github: "https://github.com/jynlee7",
  linkedin: "https://www.linkedin.com/in/jaydenelee",
  resume: "/resume.pdf",
  graduation: "May 2028",
  degree: "B.A. Data Science",
  emphasis: "Applied Mathematics",
  gpa: "3.7",
  activities: ["Sports Analytics Group at Berkeley", "Cal eSports D2 League Coach"],
  interests: ["Sports & esports", "Philosophy", "Travel", "Metals & jewelry"],
  skills: {
    "Languages": "Python, SQL, R, Java, C++, JavaScript, TypeScript, HTML/CSS",
    "Data & ML": "Pandas, Polars, NumPy, scikit-learn, PyTorch, TensorFlow, PostgreSQL, Parquet, ETL/ELT",
    "Tools": "Snowflake, Supabase, Docker, Git, Slurm, Tableau, Jupyter/Colab, Excel, Claude Code, Codex, Jira, conda",
    "Software": "React, Vite, REST APIs, Playwright, automated testing, Git worktrees",
  },
};

export const roles = [
  {
    // Jayden corrected this title on 2 Oct 2026; the 10202026 résumé agrees.
    id: "swingvision", organization: "SwingVision", title: "Data Analyst Intern",
    period: "Sep 2026 — Present", location: "Berkeley, CA", current: true,
    scene: "tennis", theme: "tennis", headline: "A closer look at the game.",
    summary: "Collaborating with ML engineers on labeling workflows for sports data.",
    paragraphs: ["Developing labeling workflows with ML engineers, improving annotation consistency by 50% across more than 50 hours of sports data."],
    proof: "50% improvement in annotation consistency · 50+ hours of sports data",
    tags: ["Sports data", "ML workflows", "Annotation"],
  },
  {
    id: "calcompute", organization: "CalCompute", title: "AI Engineering Intern",
    period: "May — Sep 2026", location: "Berkeley, CA", current: false,
    scene: "knowledge", theme: "knowledge", headline: "Research with a second brain.",
    summary: "An agentic knowledge pipeline that turns raw research into structured, source-grounded notes.",
    paragraphs: ["Built a Second Brain pipeline for LLM retrieval and reasoning workflows, connecting 22 sources and 173 references.", "Optimized context across a 14-query evaluation: prompt size fell 72.5%, inference cost fell 65.3%, and mean latency fell 33.5%."],
    proof: "22 sources · 173 references · 14-query evaluation",
    tags: ["Agentic systems", "LLM retrieval", "Evaluation"],
  },
  {
    id: "matx", organization: "MatX", title: "AI Software Engineer",
    period: "Jan — May 2026", location: "Berkeley, CA · Contract", current: false,
    scene: "compute", theme: "compute", headline: "A fair test for every model.",
    summary: "Reproducible LLM benchmarking, from model submission to the leaderboard.",
    paragraphs: ["Engineered a Kubernetes benchmarking platform that places model submissions into standardized Docker runners, enabling reproducible evaluation without rebuilding container images for each submission.", "Automated submission, metric collection, and leaderboard workflows for LLM inference benchmarks."],
    proof: "Standardized runners · Automated evaluation",
    tags: ["Kubernetes", "Docker", "LLM benchmarks"],
  },
  {
    id: "cal-athletics", organization: "Cal Athletics", title: "Data & AI Engineer",
    period: "Feb — May 2026", location: "Berkeley, CA · Contract", current: false,
    scene: "stadium", theme: "stadium", headline: "The people behind the stands.",
    summary: "Making ticket and behavioral data useful across Cal's varsity sports.",
    paragraphs: ["Cleaned and unified more than 3 million ticket records across 200+ attributes in a Snowflake and Colab pipeline feeding the fan engagement model used across Cal's 30+ varsity sports.", "Used clustering and supervised ML to predict ticket-purchase propensity and produce a dynamic fan scoring system."],
    proof: "3M+ ticket records · 200+ attributes · 30+ varsity sports",
    tags: ["Snowflake", "Behavioral modeling", "Data pipelines"],
  },
  {
    id: "pnnl", organization: "Pacific Northwest National Laboratory", shortName: "PNNL",
    title: "Data Science Intern", period: "Jun 2024 — May 2025", location: "Richland, WA", current: false,
    scene: "protein", theme: "protein", headline: "Finding signal at molecular scale.",
    summary: "Data pipelines, GPU inference, and statistical validation for mass spectrometry.",
    paragraphs: ["Built Python and Parquet ETL pipelines that unify three data schemas across 300,000+ mass spectra datasets for cross-model AI benchmarking.", "Scaled GPU batch inference across 300,000 files on a Slurm HPC cluster, and engineered target-decoy statistical frameworks to model false discovery rates."],
    proof: "300K+ datasets · 3 data schemas · GPU batch inference",
    tags: ["Python / Parquet", "Slurm / GPU", "Statistical modeling"],
  },
];

export const projects = [
  {
    id: "bearings", name: "bearings", category: "Exploration platform", scene: "transit", theme: "transit",
    summary: "A reason to take the long way through Berkeley.",
    description: "A full-stack Berkeley exploration platform with authenticated check-ins, XP progression, and organization leaderboards.",
    paragraphs: ["PostgreSQL keeps user, location, and progression data persistent. The platform brings check-ins, XP progression, and organization leaderboards into one Berkeley exploration experience.", "Connected Jira tasks to coding agents through MCP, and built a quality gate spanning TypeScript compilation, component tests, accessibility, browser interactions, visual screenshots, and change-boundary validation before integrating agent-generated code."],
    stack: ["React", "TypeScript", "PostgreSQL", "Playwright", "Jira / MCP"],
    proof: "Check in. Explore. Find your bearings.", links: [],
  },
  {
    id: "clinical", name: "Foresight", category: "Clinical Intervention Simulator", scene: "simulation", theme: "simulation",
    summary: "Exploring what could happen next.",
    description: "A clinical simulation and decision-support system, built to compare intervention strategies over time.",
    paragraphs: ["Placed first out of 50 UC Berkeley teams by developing a clinical intervention simulation and decision-support system.", "Trained a Random Forest model to estimate changes in patient risk over time and dynamically compare intervention strategies for high-risk patients."],
    stack: ["Python", "scikit-learn", "NumPy", "Tableau"],
    proof: "1st place · 50 UC Berkeley teams",
    links: [{label: "View app", href: "https://deepnote.com/streamlit-apps/c6911553-7fb9-4902-9473-cf169bfdcfe7?utm_content=598aa3a7-bc5d-4c0d-85b1-cdf21170d9ff"}],
  },
  {
    id: "site", name: "This little corner of the internet", category: "Personal website", scene: "field", theme: "field",
    summary: "A portfolio. A playground. A work in progress.",
    description: "A TypeScript portfolio exploring interactive graphics and coordinated AI development.",
    paragraphs: ["Built with Vite and TypeScript, with shared content, written specifications, and distinct portfolio and desktop experiences.", "The original desktop still runs underneath the portfolio: a contour field and movable windows. The portfolio's 3D illustrations use Three.js and retain static alternatives."],
    stack: ["TypeScript", "Vite", "Three.js", "Claude Code / Codex"],
    proof: "You're looking at it.",
    // No link to /desktop/ on purpose: it shows itself to whoever stays a
    // while (src/portfolio/peek.ts).
    links: [],
  },
];

// Earlier project retained from the supplied 2026 portfolio content. Its source
// is the user's earlier résumé, not the October résumé. Keep its old deep link.
export const archiveProjects = [{
  id: "chessblitz", name: "ChessBlitz", category: "Teaching platform",
  summary: "An open-source teaching platform in use at Berkeley Chess School.",
  paragraphs: ["Flask and Supabase support the storage layer, OpenRouter generates position-specific hints, and a React dashboard helps teachers manage rosters and assignments."],
  stack: ["Flask", "Supabase", "OpenRouter", "React"],
  links: [{label: "View source", href: "https://gitlab.com/devahschaefers/chessblitz"}],
}];
