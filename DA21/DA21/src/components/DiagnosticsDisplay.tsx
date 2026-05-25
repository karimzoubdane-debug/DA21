'use client';

interface DiagnosticsDisplayProps {
  diagnostics: Record<string, unknown>;
  synthesis: Record<string, unknown>;
  onBack: () => void;
}

export default function DiagnosticsDisplay({ diagnostics, synthesis, onBack }: DiagnosticsDisplayProps) {
  const renderDiagnostic = (
    title: string,
    icon: string,
    borderColor: string,
    bgColor: string,
    textColor: string,
    data: any
  ) => {
    if (!data) return null;

    return (
      <div className={`mb-8 p-6 border-l-4 ${borderColor} ${bgColor} rounded`}>
        <h2 className={`text-2xl font-bold mb-4 ${textColor}`}>
          {icon} {title}
        </h2>

        {data.verdict && (
          <div className="bg-white p-4 rounded mb-4">
            <h3 className={`text-lg font-semibold ${textColor}`}>
              VERDICT: {data.verdict.verdict || 'N/A'}
            </h3>
            <p className={`mt-2 ${textColor}`}>
              {data.verdict.raison || data.verdict.raison_chiffree || data.verdict.raison_authenticite || ''}
            </p>
          </div>
        )}

        {data.points_forts && Array.isArray(data.points_forts) && data.points_forts.length > 0 && (
          <div className="mb-4">
            <h3 className={`text-lg font-semibold ${textColor}`}>✅ Points Forts</h3>
            {data.points_forts.map((pf: any, i: number) => (
              <div key={i} className="ml-4 mt-2 p-3 bg-white rounded border-l-2 border-green-500">
                <p className={`font-semibold ${textColor}`}>{pf.force || pf.signal || pf.strength}</p>
                {pf.section && <p className="text-sm">{pf.section}</p>}
                <p>{pf.observation || pf.description}</p>
              </div>
            ))}
          </div>
        )}

        {data.points_faibles && Array.isArray(data.points_faibles) && data.points_faibles.length > 0 && (
          <div>
            <h3 className={`text-lg font-semibold ${textColor}`}>❌ Points Faibles</h3>
            {data.points_faibles.map((pf: any, i: number) => (
              <div key={i} className="ml-4 mt-2 p-3 bg-white rounded border-l-2 border-red-500">
                <p className={`font-semibold ${textColor}`}>{pf.faiblesse || pf.incohérence || pf.weakness}</p>
                {pf.section && <p className="text-sm">{pf.section}</p>}
                {pf.standard && <p><strong>Standard:</strong> {pf.standard}</p>}
                {pf.ecart_observe && <p><strong>Observé:</strong> {pf.ecart_observe}</p>}
              </div>
            ))}
          </div>
        )}

        {data.metriques && (
          <div className="bg-white p-4 rounded mt-4">
            <h3 className={`font-semibold ${textColor} mb-2`}>📊 Métriques</h3>
            {Object.entries(data.metriques).map(([key, value]) => (
              <p key={key}><strong>{key}:</strong> {String(value)}</p>
            ))}
          </div>
        )}

        {data.authenticite_signals && (
          <div className="bg-white p-4 rounded mt-4">
            <h3 className={`font-semibold ${textColor} mb-2`}>🎯 Authenticité</h3>
            <p><strong>Coherence:</strong> {data.authenticite_signals.narrative_coherence_score}/10</p>
            <p><strong>Soft Skills:</strong> {data.authenticite_signals.soft_skills_progression ? '✅' : '❌'}</p>
            <p><strong>Growth Mindset:</strong> {data.authenticite_signals.growth_mindset_visible ? '✅' : '❌'}</p>
            <p><strong>Vulnérabilité:</strong> {data.authenticite_signals.vulnerability_admitted ? '✅' : '❌'}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-8 bg-slate-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-8">📊 Résultats Audit</h1>

      {renderDiagnostic(
        'Diagnostic Claude (Narratif)',
        '🔵',
        'border-blue-500',
        'bg-blue-50',
        'text-blue-900',
        diagnostics.ia1
      )}

      {renderDiagnostic(
        'Diagnostic GPT-4O (Structuré)',
        '🟢',
        'border-green-500',
        'bg-green-50',
        'text-green-900',
        diagnostics.ia2
      )}

      {renderDiagnostic(
        'Diagnostic Gemini (Authenticité)',
        '🟣',
        'border-purple-500',
        'bg-purple-50',
        'text-purple-900',
        diagnostics.ia3
      )}

      {synthesis && Object.keys(synthesis).length > 0 && (
        <div className="mb-8 p-6 border-l-4 border-orange-500 bg-orange-50 rounded">
          <h2 className="text-2xl font-bold mb-4 text-orange-900">🔄 Synthèse</h2>
          <p className="text-orange-800">{synthesis.summary || JSON.stringify(synthesis)}</p>
        </div>
      )}

      <div className="flex gap-4">
        <button onClick={onBack} className="flex-1 p-3 rounded font-bold bg-gray-200 hover:bg-gray-300">
          ← Nouveau Audit
        </button>
      </div>
    </div>
  );
}
