import { Component, type ReactNode } from "react";

const RELOAD_FLAG_KEY = "inventra_chunk_reload_at";
const RELOAD_COOLDOWN_MS = 10_000;

function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|module script failed|loading chunk/i.test(message);
}

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Route chunks are content-hashed, so every deploy invalidates the chunk URLs a
 * tab already has open. Mobile Safari keeps tabs alive in the background far
 * longer than a desktop dev browser gets reloaded, so it's the one that ends up
 * navigating to a stale chunk URL and 404ing — and without a boundary here,
 * React unmounts the whole tree on that uncaught error, leaving a blank screen.
 */
export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (!isChunkLoadError(error)) return;

    const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) ?? "0");
    if (Date.now() - lastReload > RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
      window.location.reload();
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const chunkError = isChunkLoadError(this.state.error);

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-500" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {chunkError ? "Updating the app…" : "Something went wrong."}
        </p>
        {!chunkError ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            Reload
          </button>
        ) : null}
      </div>
    );
  }
}
