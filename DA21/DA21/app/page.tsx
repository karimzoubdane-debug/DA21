'use client';

import { useState } from 'react';
import ConfigurationPanel from '@/src/components/ConfigurationPanel';
import InputForm from '@/src/components/InputForm';
import DiagnosticsDisplay from '@/src/components/DiagnosticsDisplay';

interface IAConfig {
  model: string;
  apiKey: string;
  enabled?: boolean;
}

type Screen = 'config' | 'input' | 'results';

export default function Home() {
  const [screen, setScreen] = useState<Screen>('config');
  const [iaConfig, setIAConfig] = useState<{ ia1: IAConfig; ia2: IAConfig; ia3: IAConfig } | null>(null);
  const [results, setResults] = useState<{ diagnostics: Record<string, unknown>; synthesis: Record<string, unknown> } | null>(null);

  const handleConfigComplete = (config: { ia1: IAConfig; ia2: IAConfig; ia3: IAConfig }) => {
    setIAConfig(config);
    setScreen('input');
  };

  const handleAuditSubmit = (data: { diagnostics: Record<string, unknown>; synthesis: Record<string, unknown> }) => {
    setResults(data);
    setScreen('results');
  };

  const handleBack = () => {
    if (screen === 'input') {
      setScreen('config');
      setIAConfig(null);
    } else if (screen === 'results') {
      setScreen('config');
      setIAConfig(null);
      setResults(null);
    }
  };

  return (
    <>
      {screen === 'config' && <ConfigurationPanel onComplete={handleConfigComplete} />}
      {screen === 'input' && iaConfig && <InputForm iaConfig={iaConfig} onSubmit={handleAuditSubmit} onBack={handleBack} />}
      {screen === 'results' && results && <DiagnosticsDisplay diagnostics={results.diagnostics} synthesis={results.synthesis} onBack={handleBack} />}
    </>
  );
}
