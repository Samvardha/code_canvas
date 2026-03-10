import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import Features from "@/components/features";
import FeatureHighlight from "@/components/feature-highlight";
import CommunityPreview from "@/components/community-preview";
import OpenProjects from "@/components/open-projects";
import HowItWorks from "@/components/how-it-works";
import Footer from "@/components/footer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-background relative selection:bg-accent selection:text-black font-sans text-foreground">
      {/* Pure Background Grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />

        <Hero />
        <Features />

        <FeatureHighlight />
        <HowItWorks />
        <CommunityPreview />
        <OpenProjects />

        {/* Call To Action */}
        <section className="bg-accent text-black py-32 relative overflow-hidden flex flex-col items-center px-4 md:px-8 border-y border-border">
          {/* Subtle dark pattern over the accent color */}
          <div
            className="absolute inset-0 grid-bg opacity-10 pointer-events-none"
            style={{ filter: "invert(1)" }}
          />

          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold font-(family-name:--font-space-grotesk) tracking-tighter uppercase mb-8 text-black">
              INITIALIZE YOUR NETWORK
            </h2>
            <p className="text-xl px-4 md:px-0 opacity-80 mb-12 font-medium max-w-2xl mx-auto text-black">
              Join thousands of elite engineers building the future together. No
              fluff, just pure code.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 w-full mx-auto">
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-white text-black px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors duration-300 border-2 border-black"
              >
                CREATE ACCOUNT
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border-2 border-black text-black px-8 py-4 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors duration-300 bg-transparent"
              >
                LOGIN
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </main>
  );
}
