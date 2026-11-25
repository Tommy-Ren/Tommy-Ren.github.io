export interface Project {
  id: string;
  name: string;
  category: string;
  year: string;
  description: string;
  highlights?: string[];
  stack: string[];
  repository: string;
  liveUrl?: string;
  preview?: { src: string; alt: string };
  accent: string;
}

export const featuredProjects: Project[] = [
  {
    id: 'bby-infrastructure',
    name: 'BBY Infrastructure Explorer',
    category: 'Full-stack geospatial application',
    year: '2026',
    description: 'An interactive map for exploring traffic-calming infrastructure around Burnaby schools, backed by a FastAPI service and a Python geospatial data pipeline.',
    highlights: [
      'Search for schools, compare coverage at 100, 250, and 500 metres, and share a link to the selected school.',
      'Refresh official ArcGIS data automatically and retain the last valid snapshot if validation fails.',
      'Cover the API, data contract, and browser workflows with automated tests.',
    ],
    stack: ['Python', 'FastAPI', 'React', 'TypeScript', 'GeoPandas', 'Playwright'],
    repository: 'https://github.com/Tommy-Ren/BBY-Infrastructure-Explorer',
    liveUrl: 'https://bby-infrastructure-explorer.vercel.app/',
    preview: { src: '/images/project-bby.webp', alt: 'Burnaby school map with a coverage radius and nearby infrastructure' },
    accent: '#bcf36b',
  },
  {
    id: 'retimetric',
    name: 'RetiMetric',
    category: 'Biomedical imaging / Team project',
    year: '2026',
    description: 'An SFU research prototype for retinal vessel analysis. I contributed the React workbench and FastAPI backend, connecting image upload, model inference, and results review.',
    highlights: [
      'Connect an Attention U-Net model to a browser-based image analysis workflow.',
      'Display segmentation masks and overlays alongside vessel density, thickness, and branching metrics.',
      'Compare results across sample images in the same workspace.',
    ],
    stack: ['Python', 'FastAPI', 'React', 'TypeScript', 'PyTorch'],
    repository: 'https://github.com/Tommy-Ren/RetiMetric',
    preview: { src: '/images/project-retimetric.webp', alt: 'RetiMetric demo showing a vessel segmentation overlay and measurements' },
    accent: '#a7b7ff',
  },
  {
    id: 'mechflow',
    name: 'MechFlow AI',
    category: 'Python backend / Computer vision',
    year: '2026',
    description: 'A video analysis prototype that turns selected points in short clips into motion trajectories for mechanical design experiments.',
    highlights: [
      'Track points across video frames with Lucas–Kanade optical flow and smooth the resulting trajectories with NumPy.',
      'Organize video uploads, tracking, and saved trajectories into separate API and service modules.',
      'Use Alembic migrations and test the upload-to-trajectory flow with pytest.',
    ],
    stack: ['Python', 'FastAPI', 'OpenCV', 'NumPy', 'SQLAlchemy', 'PostgreSQL', 'pytest'],
    repository: 'https://github.com/Tommy-Ren/MechFlow-AI',
    accent: '#eebc86',
  },
  {
    id: 'concurrent-http',
    name: 'Concurrent HTTP Server in C',
    category: 'Systems programming / Team project',
    year: '2025',
    description: 'A BCIT team project that serves HTTP requests through a pool of worker processes. I contributed to the HTTP response code and server shutdown handling.',
    highlights: [
      'Accept TCP connections using pre-forked workers, non-blocking sockets, and poll().',
      'Monitor worker exits with waitpid() and replace workers that stop.',
      'Load the HTTP request handler from a shared library to separate it from the server loop.',
    ],
    stack: ['C', 'POSIX', 'TCP Sockets', 'poll()', 'fork()'],
    repository: 'https://github.com/Tommy-Ren/COMP4981-assign4',
    accent: '#d1aaf5',
  },
];

export const otherProjects: Project[] = [
  {
    id: 'lottery',
    name: 'BC Lottery Simulator',
    category: 'Interactive web application',
    year: '2026',
    description:
      'A browser-based playground for five Canadian lottery games. Explore virtual draws, a local wallet, and historical results through a bilingual interface. Every ticket and balance is virtual.',
    stack: ['React', 'TypeScript', 'Vite', 'IndexedDB', 'Vitest'],
    repository: 'https://github.com/Tommy-Ren/BC-Lottery-Simulator',
    liveUrl: 'https://bc-lottery-simulator.vercel.app/',
    preview: { src: '/images/project-lottery.svg', alt: 'BC Lottery Simulator project illustration' },
    accent: '#bcf36b',
  },
  {
    id: 'matcher',
    name: 'GitPortfolio Matcher',
    category: 'Applied AI / Developer tooling',
    year: '2026',
    description:
      'A local-first command-line assistant that turns GitHub repositories into a tailored portfolio shortlist. It reads project documentation, creates structured summaries, and matches projects to a job description. Currently in MVP / beta development.',
    stack: ['TypeScript', 'Node.js', 'SQLite', 'GitHub API', 'OpenAI-compatible AI'],
    repository: 'https://github.com/Tommy-Ren/GitPortfolio-Matcher',
    preview: { src: '/images/project-matcher.svg', alt: 'GitPortfolio Matcher project illustration' },
    accent: '#a7b7ff',
  },
  {
    id: 'planets',
    name: 'Planet Texture Generator',
    category: 'Procedural generation / Graphics',
    year: '2026',
    description:
      'A browser tool for generating seamless planet textures from a seed. Web Workers run the texture calculations so the interface stays responsive while generating terrain and clouds.',
    stack: ['JavaScript', 'Vite', 'Web Workers', 'Canvas', 'Procedural noise'],
    repository: 'https://github.com/Tommy-Ren/Planet-Texture-Generator',
    preview: { src: '/images/project-planets.svg', alt: 'Planet Texture Generator project illustration' },
    accent: '#eebc86',
  },
];

export const profile = {
  name: 'Tommy Ren',
  shortName: 'Tommy',
  email: 'rent823242@gmail.com',
  linkedin: 'https://www.linkedin.com/in/tommy-ren',
  github: 'https://github.com/Tommy-Ren',
  location: 'Burnaby, BC',
  intro:
    "I'm Tommy, a Computing Science student at Simon Fraser University and a BCIT Computer Systems Technology graduate. I build across backend systems, applied AI, web applications, and games. I like looking beneath the interface, understanding the moving parts, and turning an idea into something people can use.",
  education: [
    {
      school: 'Simon Fraser University',
      degree: 'BSc, Computing Science',
      period: 'Sep 2025 — Present',
      detail: 'Artificial Intelligence concentration · Statistics minor',
    },
    {
      school: 'British Columbia Institute of Technology',
      degree: 'Diploma, Computer Systems Technology',
      period: 'Sep 2023 — May 2025',
      detail: 'Predictive Analytics concentration',
    },
  ],
};

export const experience = [
  {
    role: 'Game Developer',
    company: 'Codex Nova',
    period: 'Jan 2025 — Present',
    description:
      'Build modular C# gameplay systems and Unity Editor tools, with a focus on performance and maintainable game code.',
  },
  {
    role: 'Cloud Engineering Intern',
    company: 'Agora Art',
    period: 'May 2025 — Jun 2025',
    description:
      'Built Flask APIs, recommendation workflows, and cloud services with PostgreSQL and AWS EC2 / ECS.',
  },
  {
    role: 'Full-Stack Developer Intern',
    company: 'Granville Biomedical',
    period: 'Sep 2024 — Jan 2025',
    description:
      'Built React / TypeScript biomedical applications, integrated Firebase and Square, and coordinated a four-person development team.',
  },
];

export const expertise = [
  {
    number: '01',
    name: 'Backend & Systems',
    description:
      'APIs, databases, networking, and concurrency. I care about how a system behaves beneath its interface.',
  },
  {
    number: '02',
    name: 'Applied AI',
    description:
      'Connecting models, data, and software to useful workflows, informed by my studies in AI and statistics.',
  },
  {
    number: '03',
    name: 'Full-Stack Development',
    description:
      'React and TypeScript interfaces connected to backend services, with attention to usability and reliable behavior.',
  },
  {
    number: '04',
    name: 'Game Development',
    description:
      'C# gameplay systems, Unity tooling, and procedural experiments that make ideas playable.',
  },
  {
    number: '05',
    name: 'Cloud & Infrastructure',
    description:
      'Working with AWS, containers, and deployment workflows to bring applications beyond the local machine.',
  },
];
