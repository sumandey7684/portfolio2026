'use client'

import { Marquee } from "@/components/magicui/marquee";
import Image from "next/image";
import { useState } from "react";


// Tech Stack Data
const techStack = [
  // Languages
  { name: "JavaScript", category: "language", icon: "/tech-icons/javascript.svg", color: "bg-gray-500" },
  { name: "Python", category: "language", icon: "/tech-icons/python.svg", color: "bg-gray-500" },
  { name: "Java", category: "language", icon: "/tech-icons/java.svg", color: "bg-gray-500" },
  { name: "SQL", category: "language", icon: "/tech-icons/sql.svg", color: "bg-gray-500" },
  
  // Frameworks & Libraries
  { name: "React.js", category: "framework", icon: "/tech-icons/react.svg", color: "bg-gray-500" },
  { name: "Next.js", category: "framework", icon: "/tech-icons/nextjs.svg", color: "bg-cyan-800" },
  { name: "Express.js", category: "framework", icon: "/tech-icons/express.svg", color: "bg-cyan-700" },
  { name: "Node.js", category: "framework", icon: "/tech-icons/nodejs.svg", color: "bg-gray-600" },
  { name: "Tailwind CSS", category: "framework", icon: "/tech-icons/tailwind.svg", color: "bg-gray-400" },
  
  // Databases & Backend
  { name: "MongoDB", category: "database", icon: "/tech-icons/mongodb.svg", color: "bg-gray-500" },
  { name: "PostgreSQL", category: "database", icon: "/tech-icons/postgresql.svg", color: "bg-gray-600" },
  
  // DevOps
  { name: "Git", category: "tool", icon: "/tech-icons/git.svg", color: "bg-gray-700" },
  { name: "Docker", category: "tool", icon: "/tech-icons/docker.svg", color: "bg-gray-400" },
  { name: "AWS", category: "tool", icon: "/tech-icons/aws.svg", color: "bg-gray-600" },
];

interface TechIconProps {
  tech: typeof techStack[0];
  className?: string;
}

function TechIcon({ tech, className = "" }: TechIconProps) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={`flex flex-col items-center justify-center p-2 sm:p-3 transition-all duration-300 hover:scale-105 min-w-[80px] sm:min-w-[90px] group ${className}`}>
      {/* Icon Container */}
      <div className="relative w-8 h-8 sm:w-10 sm:h-10 mb-1.5 sm:mb-2 flex items-center justify-center">
        {/* Try to load actual SVG, fallback to grey placeholder */}
        <div className="w-full h-full relative">
          {imageFailed ? (
            <div className={`w-full h-full ${tech.color} rounded-lg flex items-center justify-center text-white text-sm font-bold`}>
              {tech.name.charAt(0)}
            </div>
          ) : (
            <Image
              src={tech.icon}
              alt={tech.name}
              width={40}
              height={40}
              className="w-full h-full object-contain grayscale opacity-70 hover:opacity-90 transition-opacity"
              onError={() => setImageFailed(true)}
            />
          )}
        </div>
      </div>
      
      {/* Tech Name */}
      <span className="text-[10px] sm:text-xs text-center font-medium text-gray-700 dark:text-gray-300 leading-tight group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
        {tech.name}
      </span>
    </div>
  );
}

interface TechStackMarqueeProps {
  className?: string;
}

export default function TechStackMarquee({ className = "" }: TechStackMarqueeProps) {
  return (
    <div className={`w-full ${className}`}>
      {/* Title - matching other component styles */}
      <div className="mb-4">
        <h2 className="text-base font-[family-name:var(--font-instrument-serif)] sm:text-xl mb-3 opacity-20 mt-4 sm:mt-6 -tracking-[0.01em]">
          Stack I use
        </h2>
        <p className="text-sm sm:text-base dark:text-white/70 text-black/70 leading-relaxed">
          Technologies I work with to build products that solve real problems
        </p>
      </div>

      {/* Single Marquee Container */}
      <div className="relative">
        <Marquee pauseOnHover className="[--duration:80s] [--gap:1rem]">
          {techStack.map((tech, index) => (
            <TechIcon key={`${tech.name}-${index}`} tech={tech} />
          ))}
        </Marquee>

        {/* Fade edges for better visual effect */}
        <div className="absolute left-0 top-0 w-20 h-full bg-linear-to-r from-white dark:from-zinc-900 to-transparent pointer-events-none z-10" />
        <div className="absolute right-0 top-0 w-20 h-full bg-linear-to-l from-white dark:from-zinc-900 to-transparent pointer-events-none z-10" />
      </div>
    </div>
  );
}
