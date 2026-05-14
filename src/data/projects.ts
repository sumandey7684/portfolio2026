import { Project } from '@/types/project'

export const projects: Project[] = [
  {
    id: "readmehub",
    title: "ReadmeHub",
    description:
      "Fully client-side GitHub README generator with structured templates, live markdown preview, and developer-focused customization tools.",
    longDescription:
      "ReadmeHub is a modern GitHub README generator built for developers who want polished documentation without repetitive manual formatting. It features 15 structurally unique templates, live markdown rendering, responsive split-pane editing, GitHub profile widgets, and 90+ categorized tech badges, all running entirely in the browser with zero backend dependency.",
    liveLink: "https://readme-hub.sumandey.in/",
    githubLink: "https://github.com/sumandey7684/readme-hub",
    image: "/images/readmehub.png",
    tags: ["React", "TypeScript", "Vite", "Tailwind CSS", "Markdown"],
  },
  {
    id: "tale",
    title: "Tale",
    description:
      "UI/UX practice project with calm design systems and structured wellness flows built around a high-conversion landing page.",
    longDescription:
      "Tale is a UI/UX practice project focused on calm design systems and structured user flows for mental wellness. The product experience is designed to feel minimal and intentional while driving conversions through a clear and focused landing page journey.",
    liveLink: "https://tale.sumandey.in/",
    githubLink: "https://github.com/sumandey7684/Tale",
    image: "/images/tale2.png",
    tags: ["React", "TypeScript", "Vite", "Tailwind CSS"],
  },
  {
    id: "pdfly",
    title: "PDFly",
    description:
      "Professional PDF toolkit with browser-only processing, zero uploads, no accounts, and no tracking.",
    longDescription:
      "PDFly delivers professional PDF tooling that runs fully in the browser. It is built for speed, privacy, and security with local processing only, while still matching the experience and capabilities users expect from paid tools.",
    liveLink: "https://pdfly.sumandey.in",
    githubLink: "https://github.com/sumandey7684/pdfly",
    image: "/images/pdfly2.png",
    tags: ["Next.js 14", "TypeScript", "Tailwind CSS", "Shadcn/UI", "Vercel"],
  },
  {
    id: "tarang",
    title: "Tarang",
    description:
      "Wallpaper generator for beautiful mesh gradients, designed as a minimal and aesthetic alternative to paywalled tools.",
    longDescription:
      "Tarang generates beautiful mesh-gradient wallpapers in a clean, minimal interface. It focuses on speed, aesthetic output, and ease of use for users who want high-quality wallpapers without paid barriers.",
    liveLink: "https://tarang-suman.vercel.app",
    githubLink: "https://github.com/sumandey7684/wallpaper-app",
    image: "/images/tarang1.png",
    tags: ["Next.js 14", "Tailwind CSS", "TypeScript", "Shadcn/UI", "Vercel"],
  },
  {
    id: "gyaansaar-ai",
    title: "GyaanSaar AI",
    description:
      "Q&A platform to connect with friends, share prompt images, and interact with your audience in real time.",
    longDescription:
      "GyaanSaar AI is an interactive Q&A application that helps users engage with their audience, connect with friends, and share prompt images. It combines social interaction with AI-powered conversations in a smooth web experience.",
    liveLink: "https://gyaansaar-ai.vercel.app",
    githubLink: "https://github.com/sumandey7684/GyaanSaar-Ai",
    image: "/images/gyaansaar1.png",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "OpenAI API", "Vercel"],
  },
  {
    id: "aabha",
    title: "Aabha",
    description:
      "Color conversion utility with HEX, RGB, and HSL support plus real-time conversion and an integrated picker.",
    longDescription:
      "Aabha is a practical color converter tool that supports HEX, RGB, and HSL formats with instant updates as users type. It also includes a color picker for quick visual selection and conversion workflows.",
    liveLink: "https://aabha-suman.vercel.app",
    githubLink: "https://github.com/sumandey7684/Aabha",
    image: "/images/aabha1.png",
    tags: ["Next.js", "TypeScript", "Tailwind CSS", "Shadcn/UI", "Vercel"],
  },
  {
    id: "metaversus",
    title: "Metaversus",
    description:
      "Metaverse showcase website featuring immersive visuals, smooth transitions, and motion-rich storytelling.",
    longDescription:
      "Metaversus is a visually driven showcase website centered on immersive user experience. It blends modern interface design with smooth motion and transitions to present metaverse concepts in an engaging format.",
    liveLink: "https://metaversus-ten-ashy.vercel.app",
    githubLink: "https://github.com/sumandey7684/Metaversus",
    image: "/images/metaversus1.png",
    tags: [
      "Next.js",
      "TypeScript",
      "Tailwind CSS",
      "Shadcn/UI",
      "Vercel",
      "Framer Motion",
    ],
  },
];

export const getProjectById = (id: string): Project | undefined => {
  return projects.find(project => project.id === id)
}

export const getAllProjects = (): Project[] => {
  return projects
}
