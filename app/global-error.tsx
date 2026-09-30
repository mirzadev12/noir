"use client";

import "./globals.css";

/**
 * The last resort: the root layout itself failed, so this draws its own
 * document. It uses the same tokens (globals.css) but none of the primitives,
 * which live inside the layout that just failed.
 */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto max-w-page px-gutter py-12">
          <h1 className="type-sign-black text-sign">NOIR could not be drawn</h1>
          <p className="mt-6 max-w-prose text-lead text-ink-soft">The page failed before it could start. Nothing on the desk was changed.</p>
          <button
            type="button"
            onClick={() => retry()}
            className="type-sign rule-box mt-6 min-h-control cursor-pointer bg-ink px-5 py-3 text-lead text-on-light transition-colors hover:border-route hover:bg-route"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
