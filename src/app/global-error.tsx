"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="mx-auto max-w-md rounded-lg border bg-white p-8 text-center shadow-sm">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Erreur inattendue
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            Une erreur critique est survenue. Veuillez réessayer.
          </p>
          {error.digest && (
            <p className="mb-4 text-xs text-gray-400">
              Référence : {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
