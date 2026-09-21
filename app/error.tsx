'use client';
export default function ErrorBoundary({ error, reset }) {
  return (
    <div className="p-6 bg-black text-white min-h-screen font-mono text-xs overflow-auto">
      <h2 className="text-red-500 text-lg font-bold mb-2">Errore client:</h2>
      <p className="mb-4">{error?.message || 'Errore sconosciuto'}</p>
      <pre className="text-zinc-400 whitespace-pre-wrap">{error?.stack}</pre>
      <button 
        onClick={reset} 
        className="mt-6 px-4 py-2 bg-white text-black rounded-lg font-bold"
      >
        Riprova
      </button>
    </div>
  );
}
