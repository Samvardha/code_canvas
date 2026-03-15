"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";

export default function Hero() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 40 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <section className="relative pt-16 pb-24 lg:pt-32 lg:pb-32 border-b border-border overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12 relative z-10">
        <div className="flex flex-col xl:flex-row items-center gap-12 lg:gap-20">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="flex-1 w-full"
          >
            <div className="flex items-center gap-4 mb-8">
              <span className="w-12 h-[2px] bg-accent"></span>
              <span className="text-accent text-xs font-mono uppercase tracking-widest font-bold">
                CONNECT. COLLABORATE. CODE.
              </span>
            </div>

            <motion.h1
              variants={item}
              className="text-[3.5rem] sm:text-7xl lg:text-[6.5rem] leading-[0.9] font-bold font-(family-name:--font-space-grotesk) tracking-tighter uppercase mb-2 text-white"
            >
              ENGINEERING
            </motion.h1>
            <motion.h1
              variants={item}
              className="text-[3.5rem] sm:text-7xl lg:text-[6.5rem] leading-[0.9] font-bold font-(family-name:--font-space-grotesk) tracking-tighter uppercase mb-2 text-outline"
            >
              WITHOUT
            </motion.h1>
            <motion.h1
              variants={item}
              className="text-[3.5rem] sm:text-7xl lg:text-[6.5rem] leading-[0.9] font-bold font-(family-name:--font-space-grotesk) tracking-tighter uppercase mb-12 text-white"
            >
              COMPROMISE.
            </motion.h1>

            <motion.p
              variants={item}
              className="text-lg sm:text-xl text-text-secondary max-w-2xl leading-relaxed mb-12 font-medium"
            >
              A brutalist developer network where the top 1% of engineers find
              exact technical matches, share brutal truths, and ship pure code.
              No social noise, just pure execution.
            </motion.p>

            <motion.div
              variants={item}
              className="flex flex-col sm:flex-row gap-4"
            >
              <Button
                href="/login"
                size="lg"
                variant="primary"
                className="group bg-accent text-black hover:bg-white w-full sm:w-auto leading-none"
              >
                Sign Up
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full xl:w-[450px] hidden lg:flex flex-col border border-border bg-black/80 backdrop-blur p-8 shadow-2xl relative"
          >
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-accent"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-accent"></div>

            <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
              <span className="text-xs font-mono text-text-secondary font-bold">
                SYS_LOG / ACTIVE
              </span>
              <span className="w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_8px_var(--accent)]"></span>
            </div>
            <div className="font-mono text-sm space-y-4 font-medium opacity-80">
              <p className="text-white">&gt; connection established...</p>
              <p className="text-text-secondary">&gt; identifying local node</p>
              <p className="text-text-secondary">
                &gt; matching algorithm: online
              </p>
              <p className="text-text-secondary">
                &gt; peering with 84,291 nodes
              </p>
              <p className="text-text-secondary">&gt; rendering interface_</p>
              <p className="text-accent animate-pulse">
                &gt; awaiting command_
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
