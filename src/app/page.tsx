import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { WaitlistSection } from "@/components/landing/WaitlistSection";
import { ShowGrid } from "@/components/landing/ShowGrid";
import { Footer } from "@/components/landing/Footer";
import { loadLandingEvents } from "@/lib/landing-events";

// Re-render the landing page at most once a minute so newly-published
// events show up without us having to bust caches by hand. The DB read
// itself is uncached so the seeded events appear within the window.
export const revalidate = 60;

export default async function HomePage() {
  const { events, genres } = await loadLandingEvents();

  // Hero shows the live event if any, else the next upcoming. Falls
  // back to the placeholder featured event inside HeroSection if both
  // are absent (DB empty / fetch failed).
  const featured = events.find((e) => e.isLive) ?? events[0];

  return (
    <main className="bg-stage-black min-h-screen font-body text-text-primary">
      <NavBar />
      <HeroSection featuredEvent={featured} />
      <StatsBar />
      <WaitlistSection />
      <ShowGrid events={events} genres={genres} />
      <Footer />
    </main>
  );
}
