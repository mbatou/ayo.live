type Params = { id: string };

export default function EventPage({ params }: { params: Params }) {
  return (
    <main className="bg-stage-black min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-text-secondary text-sm">
          Event detail page — AYO-015/016 · Sprint 3
        </p>
        <p className="text-text-muted text-xs mt-1">Event id: {params.id}</p>
      </div>
    </main>
  );
}
