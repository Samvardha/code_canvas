import LandingNavbar from "./components/LandingNavbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import FeatureHighlight from "./components/FeatureHighlight";
import CommunityPreview from "./components/CommunityPreview";
import OpenProjects from "./components/OpenProjects";
import HowItWorks from "./components/HowItWorks";
import MeetTheDevs from "./components/MeetTheDevs";
import Footer from "./components/Footer";
import CTA from "./components/CTA";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background relative selection:bg-accent selection:text-black font-sans text-foreground">
      <div className="fixed inset-0 grid-bg pointer-events-none z-0" />
      <div className="relative z-10 flex flex-col min-h-screen">
        <LandingNavbar />
        <Hero />
        <Features />
        <FeatureHighlight />
        <HowItWorks />
        <CommunityPreview />
        <OpenProjects />
        <MeetTheDevs />
        <CTA />
        <Footer />
      </div>
    </main>
  );
}
