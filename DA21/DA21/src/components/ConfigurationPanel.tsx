'use client';

import { useState } from 'react';

interface IAConfig {
  model: string;
  apiKey: string;
  enabled?: boolean;
}

interface ConfigPanelProps {
  onComplete: (config: { ia1: IAConfig; ia2: IAConfig; ia3: IAConfig }) => void;
}

export default function ConfigurationPanel({ onComplete }: ConfigPanelProps) {
  const [ia1, setIA1] = useState<IAConfig>({ model: 'claude', apiKey: '' });
  const [ia2, setIA2] = useState<IAConfig>({ model: 'gpt4o', apiKey: '', enabled: false });
  const [ia3, setIA3] = useState<IAConfig>({ model: 'gemini', apiKey: '', enabled: false });

  const isValid = ia1.apiKey.trim().length > 0;

  return (
    <div className="max-w-2xl mx-auto p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">🔍 LinkedRx Audit LinkedIn</h1>

      {/* IA 1 — OBLIGATOIRE */}
      <div className="mb-8 p-6 border-2 border-red-500 bg-white rounded">
        <h2 className="text-xl font-bold mb-4">IA 1 — OBLIGATOIRE</h2>
        <select
          value={ia1.model}
          onChange={(e) => setIA1({ ...ia1, model: e.target.value })}
          className="w-full p-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500"
        >
          <option value="claude">Claude Sonnet (Narratif)</option>
          <option value="gpt4o">GPT-4O (Structuré)</option>
          <option value="gemini">Gemini 2.0-Flash (Authenticité)</option>
        </select>
        <input
          type="password"
          placeholder="sk-..."
          value={ia1.apiKey}
          onChange={(e) => setIA1({ ...ia1, apiKey: e.target.value })}
          className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* IA 2 — OPTIONNEL */}
      <div className="mb-8 p-6 border border-slate-300 bg-white rounded">
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={ia2.enabled || false}
            onChange={(e) => setIA2({ ...ia2, enabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-xl font-bold">IA 2 — OPTIONNEL</span>
        </label>
        {ia2.enabled && (
          <>
            <select
              value={ia2.model}
              onChange={(e) => setIA2({ ...ia2, model: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500"
            >
              <option value="claude">Claude Sonnet</option>
              <option value="gpt4o">GPT-4O</option>
              <option value="gemini">Gemini 2.0-Flash</option>
            </select>
            <input
              type="password"
              placeholder="sk-..."
              value={ia2.apiKey}
              onChange={(e) => setIA2({ ...ia2, apiKey: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}
      </div>

      {/* IA 3 — OPTIONNEL */}
      <div className="mb-8 p-6 border border-slate-300 bg-white rounded">
        <label className="flex items-center mb-4">
          <input
            type="checkbox"
            checked={ia3.enabled || false}
            onChange={(e) => setIA3({ ...ia3, enabled: e.target.checked })}
            className="mr-2"
          />
          <span className="text-xl font-bold">IA 3 — OPTIONNEL</span>
        </label>
        {ia3.enabled && (
          <>
            <select
              value={ia3.model}
              onChange={(e) => setIA3({ ...ia3, model: e.target.value })}
              className="w-full p-2 border border-slate-300 rounded mb-4 focus:ring-2 focus:ring-blue-500"
            >
              <option value="claude">Claude Sonnet</option>
              <option value="gpt4o">GPT-4O</option>
              <option value="gemini">Gemini 2.0-Flash</option>
            </select>
            <input
              type="password"
              placeholder="sk-..."
              value={ia3.apiKey}
              onChange={(e) => setIA3({ ...ia3, apiKey: e.target.value })}
              className="w-full p-3 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
            />
          </>
        )}
      </div>

      <button
        onClick={() => onComplete({ ia1, ia2, ia3 })}
        disabled={!isValid}
        className={`w-full p-3 rounded font-bold text-white text-lg ${
          isValid ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        Continuer →
      </button>
    </div>
  );
}
