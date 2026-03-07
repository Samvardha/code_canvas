"use client";

import { motion } from "framer-motion";

export default function Features() {
  const features = [
    {
      title: "Strictly Devs",
      desc: "No recruiters. No marketers. An ecosystem built exclusively for shipping software engineers.",
    },
    {
      title: "GitHub Sync",
      desc: "Your code is your reputation. Automatic sync integration maps your activity accurately.",
    },
    {
      title: "Direct Assembly",
      desc: "Broadcast your precise stack requirements and assemble engineering teams instantly.",
    },
    {
      title: "Signal Events",
      desc: "Filter through high-signal engineering meetups, hacks, and remote pair sessions.",
    },
  ];

  return (
    <section id="features" className="border-b border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-border">
        {features.map((item, index) => (
          <div
            key={index}
            className="group flex flex-col p-8 lg:p-12 bg-background hover:bg-surface transition-colors duration-500 min-h-[300px]"
          >
            <div className="font-mono text-xs text-text-secondary border border-border w-10 h-10 flex items-center justify-center mb-12 group-hover:bg-accent group-hover:text-black group-hover:border-accent transition-colors">
              0{index + 1}
            </div>

            <div className="mt-auto">
              <h3 className="text-2xl font-bold font-(family-name:--font-space-grotesk) uppercase mb-4 text-white group-hover:text-accent transition-colors">
                {item.title}
              </h3>
              <p className="text-sm font-medium text-text-secondary leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
