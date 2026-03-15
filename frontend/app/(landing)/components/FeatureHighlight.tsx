"use client";

import { motion } from "framer-motion";

export default function FeatureHighlight() {
  const features = [
    {
      title: "Symbiotic AI Matching",
      description:
        "Our engine analyzes your semantic codebase graph and matches you with verified peer engineers based on exact stack compatibilities, not marketing resumes.",
      label: "AI CORE",
    },
    {
      title: "Raw Developer Feed",
      description:
        "A feed stripped of noise. We curate only daily progress logs, architectural decisions, and deployment events from builders pushing to production.",
      label: "NETWORK",
    },
  ];

  return (
    <section className="border-b border-border bg-black py-24 sm:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col gap-32">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex-1 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="px-3 py-1 border border-accent/20 bg-accent/5 font-bold text-xs font-mono text-accent uppercase tracking-widest">
                  {features[0].label}
                </span>
                <span className="w-12 h-px bg-border"></span>
              </div>
              <h3 className="text-4xl sm:text-6xl font-black font-(family-name:--font-space-grotesk) uppercase mb-6 text-white tracking-tighter leading-none">
                {features[0].title}
              </h3>
              <p className="text-text-secondary text-lg lg:text-xl font-medium leading-relaxed">
                {features[0].description}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full"
            >
              <div className="w-full aspect-square sm:aspect-video lg:aspect-square bg-surface border border-border relative overflow-hidden group p-6 sm:p-10 flex flex-col">
                <div className="flex justify-between items-center mb-8 border-b border-border pb-4">
                  <span className="uppercase tracking-widest text-xs font-mono font-bold text-white flex items-center gap-3">
                    <span className="w-2 h-2 bg-accent rotate-45 animate-pulse"></span>
                    Terminal Output
                  </span>
                  <span className="font-mono text-xs text-text-secondary">
                    01.
                  </span>
                </div>

                <div className="font-mono text-sm sm:text-base space-y-4 flex-1">
                  <p className="text-white opacity-60">
                    &gt; Requesting node analysis...
                  </p>
                  <p className="text-white opacity-60 pl-4">
                    parsing target parameters...
                  </p>
                  <p className="text-white font-bold mt-4 border-l-2 border-accent pl-4">
                    &gt; Match Engine Hit: [ENGINEER_8923AF]
                  </p>
                  <div className="pl-6 space-y-2 mt-4 text-xs sm:text-sm">
                    <p className="text-text-secondary">
                      ├─ Vectors: Rust, Go, gRPC
                    </p>
                    <p className="text-text-secondary">├─ Latency: 12ms</p>
                    <p className="text-accent font-bold">
                      └─ Confidence: 98.4%
                    </p>
                  </div>
                </div>

                <div className="w-full h-1 bg-border overflow-hidden mt-8 relative">
                  <motion.div
                    initial={{ width: "0%" }}
                    whileInView={{ width: "98.4%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                    className="absolute top-0 left-0 h-full bg-accent"
                  />
                </div>
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="flex-1 flex flex-col items-start lg:items-end text-left lg:text-right"
            >
              <div className="flex items-center gap-4 mb-6">
                <span className="hidden lg:block w-12 h-px bg-border"></span>
                <span className="px-3 py-1 border border-accent/20 bg-accent/5 font-bold text-xs font-mono text-accent uppercase tracking-widest">
                  {features[1].label}
                </span>
                <span className="block lg:hidden w-12 h-px bg-border"></span>
              </div>
              <h3 className="text-4xl sm:text-6xl font-black font-(family-name:--font-space-grotesk) uppercase mb-6 text-white tracking-tighter leading-none">
                {features[1].title}
              </h3>
              <p className="text-text-secondary text-lg lg:text-xl font-medium leading-relaxed">
                {features[1].description}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex-1 w-full"
            >
              <div className="w-full aspect-square sm:aspect-video lg:aspect-square bg-surface border border-border relative overflow-hidden p-6 sm:p-10 flex flex-col gap-6">
                <div className="flex justify-between items-center mb-4 border-b border-border pb-4">
                  <span className="uppercase tracking-widest text-xs font-mono font-bold text-white flex items-center gap-3">
                    <span className="w-2 h-2 bg-text-secondary rotate-45"></span>
                    Live Feed
                  </span>
                  <span className="font-mono text-xs text-text-secondary">
                    02.
                  </span>
                </div>

                <div className="group border border-border p-6 bg-background hover:border-accent transition-colors duration-300">
                  <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                    <p className="text-xs uppercase font-mono font-bold text-text-secondary group-hover:text-white transition-colors">
                      Deployment Event
                    </p>
                    <span className="text-xs font-mono text-accent">
                      JUST NOW
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl text-white font-black font-(family-name:--font-space-grotesk) tracking-tight uppercase">
                    API Gateway v2.0
                  </p>
                  <p className="font-mono text-text-secondary text-xs mt-4 uppercase tracking-widest font-bold">
                    status:{" "}
                    <span className="text-accent group-hover:animate-pulse">
                      successful
                    </span>
                  </p>
                </div>

                <div className="group border border-border p-6 bg-background opacity-60 hover:opacity-100 transition-opacity duration-300">
                  <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                    <p className="text-xs uppercase font-mono font-bold text-text-secondary">
                      Architecture Merge
                    </p>
                    <span className="text-xs font-mono text-text-secondary">
                      2M AGO
                    </span>
                  </div>
                  <p className="text-xl sm:text-2xl text-white font-black font-(family-name:--font-space-grotesk) tracking-tight uppercase">
                    Migrated to Edge SQL
                  </p>
                  <p className="font-mono text-text-secondary text-xs mt-4 uppercase tracking-widest font-bold">
                    status: <span className="text-white">compiling</span>
                  </p>
                </div>

                <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-surface to-transparent pointer-events-none"></div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
