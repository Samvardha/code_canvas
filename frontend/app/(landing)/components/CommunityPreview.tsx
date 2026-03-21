"use client";

import { motion } from "framer-motion";

export default function CommunityPreview() {
  const logs = [
    {
      type: "SOCKET",
      author: "SYSTEM",
      note: "Client connected. Live Chat Drawer synchronized.",
    },
    {
      type: "POST",
      author: "JD_88",
      note: "Broadcasted new code signal in Explore Feed.",
    },
    {
      type: "THREAD",
      author: "ALX_SEC",
      note: "Generated nested reply node. Depth level 3 reached.",
    },
    {
      type: "INDEX",
      author: "SYSTEM",
      note: "GitHub profile parsed. Tech stack badges mapped for search pagination.",
    },
  ];

  return (
    <section
      id="community"
      className="border-b border-border bg-surface py-24 sm:py-32"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6 border-b border-border pb-8">
          <h2 className="text-4xl sm:text-5xl font-black font-(family-name:--font-space-grotesk) uppercase tracking-tighter">
            NETWORK LOGS
          </h2>
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_var(--accent)]" />
            <span className="text-xs font-mono text-white uppercase tracking-widest font-bold">
              STREAM: ACTIVE
            </span>
          </div>
        </div>

        <div className="flex flex-col font-mono">
          {logs.map((log, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="py-6 border-b border-border last:border-b-0 flex flex-col md:flex-row gap-4 md:gap-8 text-sm lg:text-base text-text-secondary hover:text-white hover:bg-black/50 transition-colors px-6 -mx-6 rounded-lg font-medium"
            >
              <div className="w-24 shrink-0 font-bold text-accent">
                [{log.type}]
              </div>
              <div className="w-32 shrink-0 text-white uppercase font-bold">
                {log.author}
              </div>
              <div className="flex-1 text-white/90">{log.note}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
