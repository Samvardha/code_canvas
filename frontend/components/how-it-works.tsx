"use client";

import { motion } from "framer-motion";

export default function HowItWorks() {
  const steps = [
    {
      title: "Authenticate",
      desc: "Link your GitHub vector. Prove your code history.",
    },
    {
      title: "Initialize",
      desc: "Set your technical requirements and stack bounds precisely.",
    },
    {
      title: "Execute",
      desc: "Build in real-time. Share terminal outputs. Ship to production.",
    },
  ];

  return (
    <section className="bg-background border-b border-border py-24 sm:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <h2 className="text-4xl sm:text-6xl font-black font-(family-name:--font-space-grotesk) uppercase tracking-tighter">
            PROTOCOL SEQUENCE
          </h2>
          <p className="text-text-secondary uppercase tracking-widest text-xs font-bold text-left md:text-right border-l-2 md:border-l-0 md:border-r-2 border-accent pl-4 md:pl-0 md:pr-4 py-1">
            Follow the exact execution path to integrate with the swarm.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-10">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
                delay: i * 0.1,
              }}
              className="flex flex-col border border-border p-8 md:p-12 bg-surface overflow-hidden group relative hover:border-accent transition-colors duration-500"
            >
              {/* Massive background number */}
              <span className="text-8xl md:text-[10rem] leading-none font-black font-(family-name:--font-space-grotesk) text-border absolute md:-top-6 md:-right-6 top-0 right-0 pointer-events-none transition-colors duration-500 opacity-30 group-hover:text-accent/10 select-none">
                0{i + 1}
              </span>

              <div className="relative z-10 flex flex-col h-full min-h-[200px]">
                <div className="w-10 h-10 border border-border flex items-center justify-center font-mono text-xs font-bold text-text-secondary mb-auto group-hover:bg-accent group-hover:text-black group-hover:border-accent transition-colors duration-500">
                  {">_"}
                </div>

                <h3 className="text-2xl lg:text-3xl font-bold font-(family-name:--font-space-grotesk) uppercase mt-12 mb-4 text-white group-hover:text-accent transition-colors duration-500 tracking-tight">
                  {step.title}
                </h3>
                <p className="font-mono text-xs lg:text-sm text-text-secondary uppercase tracking-widest leading-relaxed font-bold">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
