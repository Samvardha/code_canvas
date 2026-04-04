"use client";

import { motion } from "framer-motion";
import { Github, Mail, Globe } from "lucide-react";
import Image from "next/image";

export default function MeetTheDevs() {
  const devs = [
    {
      name: "Samvardha Khandwe",
      role: "CORE ENGINEER",
      github: "https://github.com/Samvardha",
      email: "mailto:samvardha.khandwe@gmail.com",
      website: "https://whosamvardha.in",
      avatar: "/Samvardha.jpg",
    },
    {
      name: "Shantanu Verma",
      role: "CORE ENGINEER",
      github: "https://github.com/ShantanuV2709",
      email: "mailto:shantanuverma2709@gmail.com",
      avatar: "/Shantanu.jpeg",
    },
    {
      name: "Kushagra Joshi",
      role: "CORE ENGINEER",
      github: "https://github.com/joshikushagra",
      email: "mailto:kushofficial2004@gmail.com",
      avatar: "/Kushagra.jpeg",
    },
  ];

  return (
    <section id="team" className="border-b border-border bg-black py-24 sm:py-32">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-start mb-16 gap-6 border-b border-border pb-8">
          <h2 className="text-4xl sm:text-5xl font-black font-(family-name:--font-space-grotesk) uppercase tracking-tighter text-white">
            MEET THE DEVS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {devs.map((dev, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group border border-border p-8 bg-surface hover:border-accent transition-colors duration-500 relative flex flex-col items-center text-center overflow-hidden"
            >
              
              <div className="absolute top-4 left-4 font-mono text-[10px] text-text-secondary opacity-50 font-bold uppercase tracking-widest">
                NODE_0{i + 1}
              </div>

              <div className="w-48 h-48 mb-8 relative border border-border group-hover:border-accent transition-colors duration-500 flex items-center justify-center bg-black overflow-hidden shadow-[4px_4px_0px_var(--border)] group-hover:shadow-[4px_4px_0px_var(--accent)] mt-4">
                <Image 
                  src={dev.avatar} 
                  alt={dev.name}
                  fill
                  sizes="192px"
                  className="object-cover p-2 opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                />
              </div>

              <h3 className="text-2xl font-bold font-(family-name:--font-space-grotesk) uppercase text-white mb-2 tracking-tight group-hover:text-accent transition-colors">
                {dev.name}
              </h3>
              
              <p className="font-mono text-xs text-text-secondary uppercase tracking-widest font-bold mb-8">
                {dev.role}
              </p>

              <div className="flex items-center justify-center gap-4 mt-auto w-full pt-6 border-t border-border group-hover:border-accent/30 transition-colors">
                <a 
                  href={dev.github} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center justify-center w-10 h-10 border border-border hover:border-accent hover:text-accent text-text-secondary transition-colors bg-black"
                  title="GitHub Profile"
                >
                  <Github className="w-4 h-4" />
                </a>
                <a 
                  href={dev.email} 
                  className="flex items-center justify-center w-10 h-10 border border-border hover:border-accent hover:text-accent text-text-secondary transition-colors bg-black"
                  title="Send Email"
                >
                  <Mail className="w-4 h-4" />
                </a>
                {dev.website && (
                  <a 
                    href={dev.website} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center justify-center w-10 h-10 border border-border hover:border-accent hover:text-accent text-text-secondary transition-colors bg-black"
                    title="Website"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
