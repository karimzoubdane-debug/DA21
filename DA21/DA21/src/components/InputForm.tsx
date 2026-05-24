'use client';

import { useState } from 'react';

interface IAConfig {
  model: string;
  apiKey: string;
  enabled?: boolean;
}

interface InputFormProps {
  iaConfig: { ia1: IAConfig; ia2: IAConfig; ia3: IAConfig };
  onSubmit: (data: unknown) => void;
  onBack: () => void;
}

export default function InputForm({ iaConfig, onSubmit, onBack }: InputFormProps) {
  const [besoin, setBesoin] = useState('');
  const [profil, setProfil] = useState('');
  const [cv, setCV] = useState('');
  const [lm, setLM] = useState('');
  const [contexte, setContexte] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = besoin.trim() && profil.trim() && cv.trim() && lm.trim();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/linkedrx/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateData: {
            besoin,
            profil_linkedin: profil,
            cv,
            lettre_motivation: lm,
            contexte,
          },
          iaConfig,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSubmit(data);
      } else {
        setError(data.error || 'Erreur lors de l\'audit');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">📝 Données Candidat</h1>

      {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded text-red-900">{error}</div>}

      <textarea
        placeholder="Besoin explicite du candidat..."
        value={besoin}
        onChange={(e) => setBesoin(e.target.value)}
        className="w-full p-3 border border-slate-300 rounded mb-4 h-20 focus:ring-2 focus:ring-blue-500"
      />
      <input
        placeholder="URL Profil LinkedIn..."
        value={profil}
        onChange={(e) => setProfil(e.target.value)}
        className="w-full p-3 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        placeholder="Contenu CV..."
        value={cv}
        onChange={(e) => setCV(e.target.value)}
        className="w-full p-3 border border-slate-300 rounded mb-4 h-32 focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        placeholder="Lettre de Motivation..."
        value={lm}
        onChange={(e) => setLM(e.target.value)}
        className="w-full p-3 border border-slate-300 rounded mb-4 h-32 focus:ring-2 focus:ring-blue-500"
      />
      <textarea
        placeholder="Contexte (optionnel)..."
        value={contexte}
        onChange={(e) => setContexte(e.target.value)}
        className="w-full p-3 border border-slate-300 rounded mb-8 h-20 focus:ring-2 focus:ring-blue-500"
      />

      <div className="flex gap-4">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 p-3 rounded font-bold bg-gray-200 hover:bg-gray-300"
        >
          ← Retour
        </button>
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className={`flex-1 p-3 rounded font-bold text-white ${
            isValid && !loading ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          {loading ? '⏳ Audit en cours...' : '🚀 Lancer Audit'}
        </button>
      </div>
    </div>
  );
}
