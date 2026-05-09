import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { FanSidebar } from "@/components/fan/FanSidebar";

export default async function FanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/signin?role=fan&next=/fan");

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role, display_name, location")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/onboarding?next=/fan");
  if (profile.role !== "fan") redirect("/dashboard");

  return (
    <div className="flex h-screen bg-stage-black overflow-hidden">
      <FanSidebar profile={profile} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
