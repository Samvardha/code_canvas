"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";

export default function OpenProjects() {
  const projects = [
    {
      title: "Distributed KV Store",
      stack: "Rust, Raft",
      role: "Systems Engineer",
      status: "OPEN",
    },
    {
      title: "Local-First AI Agent",
      stack: "TypeScript, WASM",
      role: "Frontend Lead",
      status: "OPEN",
    },
    {
      title: "Browser-Based IDE",
      stack: "React, Docker",
      role: "Fullstack",
      status: "OPEN",
    },
    {
      title: "Zero-Knowledge Auth",
      stack: "Go, Cryptography",
      role: "Security Researcher",
      status: "FILLED",
    },
  ];

  return (
    <section
      id="projects"
      className="border-b border-border bg-background py-24 sm:py-32"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <h2 className="text-4xl sm:text-5xl font-black font-(family-name:--font-space-grotesk) uppercase tracking-tighter">
            ACTIVE CONTRACTS
          </h2>
          <button className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold hover:text-accent transition-colors border-b border-white pb-1 hover:border-accent">
            VIEW FULL ROSTER
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full overflow-x-auto pb-6 -mx-6 px-6 sm:mx-0 sm:px-0">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-y border-border text-text-secondary font-mono text-xs uppercase tracking-widest font-bold">
                <th className="py-6 font-normal w-1/3">Project</th>
                <th className="py-6 font-normal w-1/4">Stack</th>
                <th className="py-6 font-normal w-1/4">Role</th>
                <th className="py-6 font-normal text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((proj, i) => (
                <motion.tr
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="border-b border-border hover:bg-surface transition-colors group cursor-pointer"
                >
                  <td className="py-6 pr-4">
                    <span className="font-bold text-white group-hover:text-accent transition-colors text-xl font-(family-name:--font-space-grotesk) uppercase tracking-tight">
                      {proj.title}
                    </span>
                  </td>
                  <td className="py-6 font-mono text-sm font-bold text-text-secondary pr-4 uppercase tracking-widest">
                    {proj.stack}
                  </td>
                  <td className="py-6 font-mono text-sm font-bold text-white/70 pr-4 uppercase tracking-widest">
                    {proj.role}
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex justify-end">
                      <span
                        className={`px-4 py-2 font-mono font-bold text-xs uppercase tracking-widest border ${proj.status === "OPEN" ? "border-accent text-accent" : "border-border text-text-secondary opacity-50"}`}
                      >
                        {proj.status}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
