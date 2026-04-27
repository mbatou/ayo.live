export default function AuthError() {
  return (
    <main className="bg-stage-black min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="font-display text-2xl text-white mb-2">
          Sign in failed
        </h1>
        <p className="text-text-secondary mb-6">
          Something went wrong. Please try again.
        </p>
        <a href="/" className="text-ayo-gold hover:underline">
          Back to home
        </a>
      </div>
    </main>
  );
}
