import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { ShowGrid } from "@/components/landing/ShowGrid";
import { Footer } from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="bg-stage-black min-h-screen font-body text-text-primary">
      <NavBar />
      <HeroSection />
      <StatsBar />
      <WaitlistSection />
      <ShowGrid />
      <Footer />
    </main>
  );
}
