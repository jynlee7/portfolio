/**
 * Facts about Jayden. Primary source: JaydenLeeResume.pdf (26 Oct 2026),
 * copied to public/resume.pdf on 28 Oct 2026; it supersedes
 * Lee_Jayden_Resume_10202026.pdf. User additionally states: junior at UC
 * Berkeley. No invented links or results.
 *
 * The desktop compiles its documents from this file (scripts/desktop-docs.mjs)
 * and the wall at `/` takes its sign from it (scripts/wall.mjs).
 */
export const profile = {
  name: "Jayden Lee",
  introduction: "I'm a junior studying Data Science at UC Berkeley, working at the intersection of machine learning, software, and sport.",
  email: "jeyl@berkeley.edu",
  github: "https://github.com/jynlee7",
  linkedin: "https://www.linkedin.com/in/jaydenelee",
  resume: "/resume.pdf",
  graduation: "May 2028",
  degree: "B.A. Data Science",
  emphasis: "Applied Mathematics",
  gpa: "3.7",
  activities: ["Sports Analytics Group at Berkeley (Head of Business)", "Cal eSports D2 League Coach"],
  interests: ["Sports", "eSports", "Philosophy", "Traveling", "Metals and jewelry"],
  skills: {
    "Languages": "Python, SQL, R, Java, C++, JavaScript, TypeScript, HTML/CSS",
    "Data & ML": "Pandas, Polars, NumPy, scikit-learn, PyTorch, TensorFlow, Matplotlib, seaborn, PostgreSQL, Parquet, ETL/ELT",
    "Tools": "Snowflake, Supabase, Docker, Git, Slurm, Tableau, Jupyter/Colab, Excel, Claude Code, Codex, Jira, conda",
    "Software": "React, Vite, REST APIs, Playwright, automated testing, Git worktrees",
  },
};

export const roles = [
  {
    // Jayden corrected this title on 2 Oct 2026; the 26 Oct résumé agrees.
    // That résumé drops the earlier "50%" and "50+ hours" for "100+ hours".
    id: "swingvision", organization: "SwingVision", title: "Data Analyst Intern",
    period: "Sep 2026 — Present", location: "Berkeley, CA", current: true,
    summary: "Collaborating with ML engineers on labeling workflows for sports data.",
    paragraphs: ["Collaborating with ML engineers to develop a labeling workflow, improving annotation consistency across more than 100 hours of sports data."],
  },
  {
    id: "calcompute", organization: "CalCompute", title: "AI Engineering Intern",
    period: "May — Sep 2026", location: "Berkeley, CA", current: false,
    summary: "An agentic knowledge pipeline that turns raw research into structured, source-grounded notes.",
    paragraphs: ["Built an agentic Second Brain knowledge pipeline that transforms raw research into structured, source-grounded notes for LLM retrieval and reasoning workflows.", "Optimized LLM context across a 14-query evaluation: prompt size fell 72.5%, inference cost fell 65.3%, and mean latency fell 33.5%."],
  },
  {
    id: "matx", organization: "MatX", title: "AI Software Engineer",
    period: "Jan — May 2026", location: "Berkeley, CA · Contract", current: false,
    summary: "Reproducible LLM benchmarking, from model submission to the leaderboard.",
    paragraphs: ["Engineered a Kubernetes benchmarking platform that places model submissions into standardized Docker runners, enabling reproducible evaluation without rebuilding container images for each submission.", "Automated the end-to-end submission, metric collection, and leaderboard pipeline for LLM inference benchmarks."],
  },
  {
    id: "cal-athletics", organization: "Cal Athletics", title: "Data & AI Engineer",
    period: "Feb — May 2026", location: "Berkeley, CA · Contract", current: false,
    summary: "Making ticket and behavioral data useful across Cal's varsity sports.",
    paragraphs: ["Cleaned and unified more than 3 million ticket records across 200+ attributes into a Snowflake and Colab pipeline that fed the fan engagement model used across Cal's 30+ varsity sports.", "Predicted ticket-purchase propensity from behavioral data with clustering and supervised ML models, producing a dynamic fan scoring system."],
  },
  {
    id: "pnnl", organization: "Pacific Northwest National Laboratory", shortName: "PNNL",
    title: "Data Science Intern", period: "Jun 2024 — May 2025", location: "Richland, WA", current: false,
    summary: "Data pipelines, GPU inference, and statistical validation for mass spectrometry.",
    paragraphs: ["Streamlined cross-model AI benchmarking with automated Python and Parquet ETL pipelines that unify three data schemas across 300,000+ mass spectra datasets.", "Accelerated inference across 300,000 files by scaling GPU batch workflows on a Slurm HPC cluster, and implemented target-decoy statistical frameworks to model false discovery rates."],
  },
];

export const projects = [
  {
    id: "lea", name: "Lea: LiDAR Enabled Assistant",
    description: "An assistant for finding hardware issues, combining iPhone LiDAR scans with object detection and vision analysis.",
    paragraphs: ["Built a hardware inspection pipeline combining OWLv2 zero-shot object detection with Claude vision analysis to localize components in phone-captured images and assess potential defects from cropped regions.", "Co-integrated iPhone LiDAR scanning and designed an inspection interface connecting interactive 3D models, annotated photographs, and AI explanations to help users locate and understand hardware issues."],
    stack: ["Swift", "ARKit", "Python", "FastAPI", "PyTorch", "Runpod"],
    links: [{ label: "View on Devpost", href: "https://devpost.com/software/lea-lidar-enabled-assistant" }],
  },
  {
    id: "clinical", name: "Foresight",
    description: "A clinical intervention simulator: a simulation and decision-support system, built to compare intervention strategies over time.",
    paragraphs: ["Placed first out of 50 UC Berkeley teams by developing a clinical intervention simulation and decision-support system.", "Trained a Random Forest model to estimate changes in patient risk over time and dynamically compare intervention strategies for high-risk patients."],
    stack: ["Python", "scikit-learn", "NumPy", "Tableau"],
    // From the 10202026 résumé; the 26 Oct one omits it. Resolved 28 Oct 2026.
    links: [{ label: "View app", href: "https://deepnote.com/streamlit-apps/c6911553-7fb9-4902-9473-cf169bfdcfe7?utm_content=598aa3a7-bc5d-4c0d-85b1-cdf21170d9ff" }],
  },
  {
    id: "site", name: "This website",
    description: "jaydenelee.com. The front page is under works; this desktop is what is inside the wall.",
    paragraphs: ["Maintained a 7K+ line TypeScript codebase across dozens of AI-agent development sessions using machine-readable specifications, automated quality gates, and structured release logs.", "Parallelized development by routing design, implementation, and code-review tasks to specialized agents operating in isolated Git worktrees, preventing merge conflicts across concurrent workflows."],
    stack: ["TypeScript", "Vite", "Git", "Claude Code", "CI/CD"],
    links: [],
  },
];

// Earlier projects, from résumés before 26 Oct 2026. Kept on the desktop
// under their old deep links; neither is on the current résumé.
export const archiveProjects = [
  {
    id: "bearings", name: "bearings",
    description: "A full-stack Berkeley exploration platform with authenticated check-ins, XP progression, and organization leaderboards.",
    paragraphs: ["PostgreSQL keeps user, location, and progression data persistent. The platform brings check-ins, XP progression, and organization leaderboards into one Berkeley exploration experience.", "Connected Jira tasks to coding agents through MCP, and built a quality gate spanning TypeScript compilation, component tests, accessibility, browser interactions, visual screenshots, and change-boundary validation before integrating agent-generated code."],
    stack: ["React", "TypeScript", "PostgreSQL", "Playwright", "Jira / MCP"],
    links: [],
  },
  {
    id: "chessblitz", name: "ChessBlitz",
    summary: "An open-source teaching platform in use at Berkeley Chess School.",
    paragraphs: ["Flask and Supabase support the storage layer, OpenRouter generates position-specific hints, and a React dashboard helps teachers manage rosters and assignments."],
    stack: ["Flask", "Supabase", "OpenRouter", "React"],
    links: [{ label: "View source", href: "https://gitlab.com/devahschaefers/chessblitz" }],
  },
];
