type Params = { token: string };

export default function WatchPage({ params }: { params: Params }) {
  return (
    <main className="bg-stage-black min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-text-secondary text-sm">
          Stream player — AYO-020 · Sprint 4
        </p>
        <p className="text-text-muted text-xs mt-1">Token: {params.token}</p>
      </div>
    </main>
  );
}
