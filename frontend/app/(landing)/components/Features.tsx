"use client";

export default function Features() {
  const features = [
    {
      title: "Three Core Feeds",
      desc: "Navigate between Explore for ideas, Collab for team building, and Events for meetups. Powered by infinite scroll.",
    },
    {
      title: "GitHub Sync",
      desc: "Securely link your GitHub profile to verify your experience and automatically showcase your tech stack.",
    },
    {
      title: "Real-time Chat",
      desc: "Instantly connect with peers using our global, real-time socket-based chat drawer system.",
    },
    {
      title: "Node-based Comments",
      desc: "Dive deep into architectural debates with a clean, hierarchically-threaded node comment system.",
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
