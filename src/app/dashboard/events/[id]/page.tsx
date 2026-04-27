type Params = { id: string };

export default function EditEventPage({ params }: { params: Params }) {
  return (
    <main className="p-8">
      <h1 className="font-display text-2xl font-bold text-white mb-2">
        Edit event
      </h1>
      <p className="text-text-muted text-sm">
        Event editor — AYO-016 · Sprint 3.
      </p>
      <p className="text-text-muted text-xs mt-1">Event id: {params.id}</p>
    </main>
  );
}
