import { ArrowRight } from "lucide-react";
import { Button } from "@/components/Button";

export default function CTA() {
  return (
    <section className="bg-accent text-black py-32 relative overflow-hidden flex flex-col items-center px-4 md:px-8 border-y border-border">
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
          <Button
            href="/login"
            size="lg"
            variant="cta"
          >
            CREATE ACCOUNT
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button
            href="/login"
            size="lg"
            variant="outline"
          >
            LOGIN
          </Button>
        </div>
      </div>
    </section>
  );
}
