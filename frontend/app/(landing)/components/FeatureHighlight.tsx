"use client";

import { motion } from "framer-motion";

export default function FeatureHighlight() {
  const features = [
    {
      title: "Three Dedicated Feeds",
      description:
        "Tired of mixed signals? Switch instantly between the Explore Feed for general tech posts, the Collab Feed to assemble teams, and the Events Feed to discover meetups. All powered by infinite scrolling.",
      label: "DISCOVERY",
    },
    {
      title: "Socket Chat & Node Threads",
      description:
        "Seamlessly jump from post discussions to direct communication. Use our global chat drawer for real-time interaction, and our node-based comment threading for clean, deep architectural debates.",
      label: "COMMUNICATION",
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
                    &gt; GET /api/v1/feed/explore?limit=10&offset=20
                  </p>
                  <p className="text-white opacity-60 pl-4">
                    fetching next payload...
                  </p>
                  <p className="text-white font-bold mt-4 border-l-2 border-accent pl-4">
                    &gt; IntersectionObserver: sentinel visible
                  </p>
                  <div className="pl-6 space-y-2 mt-4 text-xs sm:text-sm">
                    <p className="text-text-secondary">
                      ├─ Status: 200 OK
                    </p>
                    <p className="text-text-secondary">├─ Posts Loaded: 10</p>
                    <p className="text-accent font-bold">
                      └─ hasMore: true
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
                      Thread: Component Refactoring
                    </p>
                    <span className="text-xs font-mono text-accent">
                      JUST NOW
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <div className="w-px bg-border group-hover:bg-accent transition-colors ml-2"></div>
                    <div>
                      <p className="text-lg text-white font-bold tracking-tight">
                        @TechLead
                      </p>
                      <p className="text-text-secondary text-sm mt-1">
                        Let's extract ChatDrawer logic into useChatDrawer hook.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="group border border-border p-6 bg-background opacity-60 hover:opacity-100 transition-opacity duration-300">
                  <div className="flex justify-between items-center mb-4 border-b border-border/50 pb-3">
                    <p className="text-xs uppercase font-mono font-bold text-text-secondary">
                      Nested Reply Node
                    </p>
                    <span className="text-xs font-mono text-text-secondary">
                      2M AGO
                    </span>
                  </div>
                  <div className="flex gap-4 ml-8">
                     <div className="w-4 h-px bg-border mt-3"></div>
                    <div>
                      <p className="text-lg text-white/80 font-bold tracking-tight">
                        @FrontendDev
                      </p>
                      <p className="text-text-secondary text-sm mt-1">
                        Agreed, the WebSocket socket event management should be separate.
                      </p>
                    </div>
                  </div>
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
