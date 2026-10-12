export interface Project {
  id: string;
  number: string;
  name: string;
  category: string;
  year: string;
  description: string;
  highlights: string[];
  stack: string[];
  repository: string;
  liveUrl?: string;
  image: string;
  detailImages: string[];
  accent: string;
}

export const projects: Project[] = [
  {
    id: 'lottery',
    number: '01',
    name: 'BC Lottery Simulator',
    category: 'Interactive web application',
    year: '2026',
    description:
      'A browser-based playground for five Canadian lottery games. Explore virtual draws, a local wallet, and historical results through a bilingual interface. Every ticket and balance is virtual.',
    highlights: [
      'Five game rule sets, manual picks, Quick Pick, and virtual draw settlement.',
      'Historical number frequencies, co-occurrence analysis, and searchable results.',
      'English and French, IndexedDB persistence, and local backup and restore.',
    ],
    stack: ['React', 'TypeScript', 'Vite', 'IndexedDB', 'Vitest'],
    repository: 'https://github.com/Tommy-Ren/BC-Lottery-Simulator',
    liveUrl: 'https://bc-lottery-simulator.vercel.app/',
    image: '/images/project-lottery.svg',
    detailImages: [
      '/images/project-lottery-detail.svg',
      '/images/project-lottery-secondary.svg',
    ],
    accent: '#bcf36b',
  },
  {
    id: 'matcher',
    number: '02',
    name: 'GitPortfolio Matcher',
    category: 'Applied AI / Developer tooling',
    year: '2026',
    description:
      'A local-first command-line assistant that turns GitHub repositories into a tailored portfolio shortlist. It reads project documentation, creates structured summaries, and matches projects to a job description. Currently in MVP / beta development.',
    highlights: [
      'Sync public or authenticated private repositories with GitHub OAuth.',
      'Cache README files in SQLite and produce structured project summaries.',
      'Rank projects, match job descriptions, and export Markdown, JSON, or text.',
    ],
    stack: ['TypeScript', 'Node.js', 'SQLite', 'GitHub API', 'OpenAI-compatible AI'],
    repository: 'https://github.com/Tommy-Ren/GitPortfolio-Matcher',
    image: '/images/project-matcher.svg',
    detailImages: [
      '/images/project-matcher-detail.svg',
      '/images/project-matcher-secondary.svg',
    ],
    accent: '#a7b7ff',
  },
  {
    id: 'planets',
    number: '03',
    name: 'Planet Texture Generator',
    category: 'Procedural generation / Graphics',
    year: '2026',
    description:
      'Build a world from a seed. This browser tool samples procedural 3D noise on a sphere to generate seamless planet textures, from Earth-like terrain to gas giants and lava worlds.',
    highlights: [
      'Deterministic seeded generation with seven planet recipes.',
      'Spherical noise sampling, domain warping, and biome classification.',
      'Web Workers keep the interface responsive; export diffuse and cloud PNGs.',
    ],
    stack: ['JavaScript', 'Vite', 'Web Workers', 'Canvas', 'Procedural noise'],
    repository: 'https://github.com/Tommy-Ren/Planet-Texture-Generator',
    image: '/images/project-planets.svg',
    detailImages: [
      '/images/project-planets-detail.svg',
      '/images/project-planets-secondary.svg',
    ],
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
