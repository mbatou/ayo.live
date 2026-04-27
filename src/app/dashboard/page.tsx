import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-bold text-white mb-2">
        Welcome back
      </h1>
      <p className="text-text-secondary text-sm">{user?.email}</p>
      <div className="mt-8 bg-surface rounded-card p-6">
        <p className="text-text-muted text-sm">
          Your dashboard is being built. Sprint 3 incoming.
        </p>
      </div>
    </main>
  );
}
