import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-black pt-24 pb-12">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 border-b border-border pb-16 font-mono text-xs uppercase tracking-widest text-text-secondary font-bold">
          <div className="space-y-4 flex flex-col">
            <h4 className="text-white mb-2 font-bold opacity-50">SYSTEM</h4>
            <Link
              href="#features"
              className="hover:text-accent transition-colors"
            >
              Architecture
            </Link>
            <Link
              href="#projects"
              className="hover:text-accent transition-colors"
            >
              Manifesto
            </Link>
            <Link
              href="#events"
              className="hover:text-accent transition-colors"
            >
              Logistics
            </Link>
          </div>

          <div className="space-y-4 flex flex-col">
            <h4 className="text-white mb-2 font-bold opacity-50">DOCS</h4>
            <Link href="#" className="hover:text-accent transition-colors">
              API Ref
            </Link>
            <Link href="#" className="hover:text-accent transition-colors">
              Integrations
            </Link>
            <Link href="#" className="hover:text-accent transition-colors">
              Changelog
            </Link>
          </div>

          <div className="space-y-4 flex flex-col">
            <h4 className="text-white mb-2 font-bold opacity-50">LEGAL</h4>
            <Link href="#" className="hover:text-accent transition-colors">
              Terms of Service
            </Link>
            <Link href="#" className="hover:text-accent transition-colors">
              Privacy Policy
            </Link>
            <Link href="#" className="hover:text-accent transition-colors">
              Cookie Policy
            </Link>
          </div>

          <div className="space-y-4 flex flex-col">
            <h4 className="text-white mb-2 font-bold opacity-50">SOCIAL</h4>
            <Link
              href="#"
              className="hover:text-accent transition-colors flex items-center gap-2 w-max"
            >
              Github <ArrowUpRight className="w-3 h-3" />
            </Link>
            <Link
              href="#"
              className="hover:text-accent transition-colors flex items-center gap-2 w-max"
            >
              Twitter <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        <div className="pt-24 pb-8 flex flex-col items-center justify-center">
          {/* Using text outline and white fill for clarity rather than only transparent stroke */}
          <h2 className="text-[12vw] sm:text-[10vw] leading-none font-black font-(family-name:--font-space-grotesk) tracking-tighter uppercase text-white cursor-default select-none pb-4 relative">
            TECH CONNECT
          </h2>
          <div className="flex w-full flex-col sm:flex-row justify-between items-center mt-8 font-mono text-xs uppercase text-text-secondary border-t border-border pt-8 font-bold gap-4">
            <span>
              © {new Date().getFullYear()} TECH CONNECT INC.
            </span>
            <span className="flex items-center gap-3">
              Made with ❤️ by Team Batarang Boys
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
