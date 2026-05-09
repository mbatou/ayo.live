import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export default async function DashboardProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const service = createServiceClient();
  const { data: profile } = await service
    .from("profiles")
    .select("display_name, bio, location")
    .eq("id", user!.id)
    .single();

  return (
    <div className="px-6 lg:px-10 py-8 lg:py-10 max-w-3xl">
      <h1 className="font-display text-3xl font-bold text-white mb-1">
        Profile
      </h1>
      <p className="text-text-secondary text-sm mb-8">
        How fans see you. Editing comes next sprint.
      </p>

      <dl className="bg-surface border border-border-subtle rounded-card divide-y divide-border-subtle">
        <div className="p-5 flex justify-between items-baseline">
          <dt className="text-text-muted text-xs uppercase tracking-wide">
            Email
          </dt>
          <dd className="text-white text-sm">{user!.email}</dd>
        </div>
        <div className="p-5 flex justify-between items-baseline">
          <dt className="text-text-muted text-xs uppercase tracking-wide">
            Display name
          </dt>
          <dd className="text-white text-sm">
            {profile?.display_name ?? (
              <span className="text-text-muted italic">Not set</span>
            )}
          </dd>
        </div>
        <div className="p-5 flex justify-between items-baseline">
          <dt className="text-text-muted text-xs uppercase tracking-wide">
            Location
          </dt>
          <dd className="text-white text-sm">
            {profile?.location ?? (
              <span className="text-text-muted italic">Not set</span>
            )}
          </dd>
        </div>
        <div className="p-5">
          <dt className="text-text-muted text-xs uppercase tracking-wide mb-2">
            Bio
          </dt>
          <dd className="text-white text-sm whitespace-pre-wrap">
            {profile?.bio ?? (
              <span className="text-text-muted italic">No bio yet.</span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
