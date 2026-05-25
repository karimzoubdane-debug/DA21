# 📦 DA21 — LINKEDRX

**Audit LinkedIn avec 3 IA en parallèle**

- 🔵 **Claude Sonnet** — Audit narratif
- 🟢 **GPT-4O** — Audit structuré/chiffré
- 🟣 **Gemini 2.0-Flash** — Audit authenticité

## 🚀 Démarrage rapide

```bash
npm install
npm run dev
```

Ouvre http://localhost:3000

## ⚙️ Configuration

Crée `.env.local` à la racine :

```env
PORT=3000
MOCK_MODE=false

NEXT_PUBLIC_OPENAI_API_KEY=sk-proj-XXXXX
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyXXXX
NEXT_PUBLIC_CLAUDE_API_KEY=sk-ant-XXXXX
```

## 📋 Flux utilisateur

1. **Configuration** : Sélectionner 1-3 IA + clés API
2. **Input** : Remplir données candidat (besoin, profil LinkedIn, CV, lettre de motivation)
3. **Résultats** : Voir 3 audits en parallèle + synthèse consensus

## 🏗️ Architecture

- **Next.js 16.2** + React 19 + TypeScript
- **Tailwind CSS** pour les styles
- **API Route** : `/api/linkedrx/audit` (Promise.all pour parallélisme)
- **3 composants UI** : ConfigurationPanel, InputForm, DiagnosticsDisplay

## 📊 Stack technique

- `next` 16.2.6
- `react` 19.2.4
- `tailwindcss` 4
- `typescript` 5

---

**Prêt à auditer !** 🔍
