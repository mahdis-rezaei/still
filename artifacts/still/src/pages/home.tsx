import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center max-w-[680px] mx-auto">
      <h1 className="font-display text-5xl md:text-7xl text-deep-brown mb-6">
        Still
      </h1>
      <p className="text-xl md:text-2xl text-ink mb-6">
        A companion for your past selves.
      </p>
      <p className="text-lg text-soft-ink leading-relaxed mb-12 max-w-md mx-auto">
        Paste entries from different years. Still looks for what endured across the writing — and stays quiet when nothing honest surfaces.
      </p>
      
      <div className="flex flex-col items-center gap-4">
        <Link 
          href="/paste" 
          className="bg-ink hover:bg-deep-brown text-surface px-8 py-3 rounded-sm font-body text-lg transition-colors"
        >
          Read across time
        </Link>
        <span className="text-sm font-sans text-faint-ink">
          Your writing is read once for this prototype. Nothing is stored.
        </span>
      </div>
    </div>
  );
}
