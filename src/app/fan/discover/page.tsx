import { redirect } from "next/navigation";

// Discover lives on the public landing page for now (the events strip).
// When fan-only discovery has its own surface, build it here.
export default function FanDiscoverPage() {
  redirect("/");
}
