import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  DashboardSidebar,
  DashboardMobileNav,
} from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/signin?role=artist&next=/dashboard");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding?next=/dashboard");
  if (profile.role !== "artist") redirect("/");

  return (
    <div className="bg-stage-black min-h-screen flex flex-col lg:flex-row">
      <DashboardSidebar email={user.email ?? null} />
      <DashboardMobileNav />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
