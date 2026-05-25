'use client';

import React, { useState, useMemo } from "react";

/* ============================================================================
   LinkedRx — Assistant IA universel d'optimisation de profil LinkedIn
   Multi-moteurs · Diagnostic croisé · Propositions & Synthèse
   ========================================================================== */

const FONTS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Spline+Sans:wght@400;500;600;700&family=Spline+Sans+Mono:wght@400;500;600&display=swap');
* { box-sizing: border-box; }
@keyframes lrx-fade { from { opacity:0; transform: translateY(8px);} to {opacity:1; transform:none;} }
@keyframes lrx-pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes lrx-spin { to { transform: rotate(360deg);} }
@keyframes lrx-bar { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
::selection { background:#B5481F; color:#F4EEE2; }
`;

const T = {
  paper: "#F4EEE2", paper2: "#ECE4D4", card: "#FBF7EE",
  ink: "#221B13", inkSoft: "#5C5142", inkFaint: "#8C8170",
  line: "#DBD0BA", lineSoft: "#E7DECB",
  accent: "#B5481F", good: "#2F6B4F", warn: "#B5841C", crit: "#A82E22",
};

const ENGINES = [
  { id: "claude", name: "Claude", vendor: "Anthropic", color: "#B5481F", endpoint: "anthropic", model: "claude-3-5-sonnet-20241022", keyUrl: "platform.anthropic.com" },
  { id: "openai", name: "GPT-4o", vendor: "OpenAI", color: "#2F6B4F", endpoint: "openai", url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o", keyUrl: "platform.openai.com" },
  { id: "gemini", name: "Gemini", vendor: "Google", color: "#7A3E8E", endpoint: "gemini", model: "gemini-2.0-flash", keyUrl: "aistudio.google.com" },
  { id: "mistral", name: "Mistral", vendor: "Mistral AI", color: "#C0651E", endpoint: "openai", url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-large-latest", keyUrl: "console.mistral.ai" },
  { id: "grok", name: "Grok", vendor: "xAI", color: "#3A4654", endpoint: "openai", url: "https://api.x.ai/v1/chat/completions", model: "grok-2-latest", keyUrl: "console.x.ai" },
];

const SECTIONS = [
  "Titre (Headline)",
  "Résumé « À propos »",
  "Expériences professionnelles",
  "Compétences & Endorsements",
  "Recommandations",
  "Activité & Publications",
];

const HATS = [
  { id: "recruteur", label: "Recruteur", icon: "◆" },
  { id: "seo", label: "SEO LinkedIn", icon: "◇" },
  { id: "coach", label: "Coach carrière", icon: "○" },
];

const PRIO = {
  CRITIQUE: { color: T.crit, bg: "#F7E4E1", label: "Critique" },
  IMPORTANT: { color: T.warn, bg: "#F6EBD3", label: "Important" },
  BONUS: { color: T.good, bg: "#E1EFE7", label: "Bonus" },
};

/* ----------------------------- AI plumbing ------------------------------- */

function parseJSON(text) {
  if (!text) return null;
  let t = String(text).trim();
  t = t.replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const s = t.indexOf("{"); const e = t.lastIndexOf("}");
  if (s >= 0 && e > s) t = t.slice(s, e + 1);
  try { return JSON.parse(t); } catch { return null; }
}

async function callEngine(engine, system, user, maxTokens = 4000) {
  const res = await fetch("/api/linkedrx/audit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      engineId: engine.id,
      model: engine.model,
      key: engine.key,
      system,
      user,
      maxTokens,
    }),
  });
  if (!res.ok) {
    const e = await res.text();
    throw new Error(`${engine.name} ${res.status}: ${e.slice(0, 160)}`);
  }
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.text || "";
}

/* ------------------------------- Prompts --------------------------------- */

function ctx(d) {
  return `PARAMÈTRES DU CANDIDAT
- Secteur cible : ${d.secteur || "non précisé"}
- Pays / région : ${d.pays || "non précisé"}
- Type d'employeur visé : ${d.employeur || "non précisé"}
- Niveau de poste : ${d.niveau || "non précisé"}
- Prétentions salariales : ${d.salaire || "non précisé"}
- Timing : ${d.timing || "non précisé"}
- Employeurs cibles : ${d.cibles || "non précisé"}

PROFIL LINKEDIN (texte fourni par le candidat)
${d.linkedin || "(vide)"}

CV
${d.cv || "(vide)"}

LETTRE DE MOTIVATION
${d.lettre || "(vide)"}

TEXTE LIBRE DU CANDIDAT
${d.libre || "(vide)"}

RÉPONSES AUX QUESTIONS DE CLARIFICATION
${d.qa || "(aucune)"}`;
}

const HAT_FOCUS = {
  recruteur: `Tu analyses comme un recruteur spécialisé du secteur cible, pour ce type d'employeur, dans ce pays. Tu regardes : clarté du positionnement, adéquation des compétences aux standards du secteur, certifications attendues, outils du métier, signaux positifs/négatifs vus en 6 secondes.`,
  seo: `Tu analyses comme un expert de l'algorithme LinkedIn : densité et pertinence des mots-clés par section pour ce secteur et ce pays, titre optimisé pour les recherches recruteurs, complétude du profil, cohérence des mots-clés entre sections.`,
  coach: `Tu analyses comme un coach carrière : force du storytelling, cohérence parcours/ambitions, impact mesurable (chiffres/résultats), gestion des transitions et gaps, authenticité et différenciation.`,
};

function promptQuestions(engineId) {
  const spec = {
    claude: "Tu portes une attention particulière à la cohérence chronologique, aux gaps non expliqués, et aux écarts entre le texte libre et les documents officiels.",
    openai: "Tu portes une attention particulière aux certifications, outils et compétences techniques attendus dans le secteur, ainsi qu'aux langues de travail selon le pays.",
    gemini: "Tu portes une attention particulière à la cohérence entre les aspirations déclarées et le parcours réel, et aux motivations exprimées dans le texte libre.",
    mistral: "Tu portes une attention particulière aux éléments différenciants et à la valeur ajoutée unique du candidat.",
    grok: "Tu portes une attention particulière aux angles morts et aux informations que le candidat n'a pas pensé à mentionner.",
  };
  return `Tu es un expert en optimisation de profil LinkedIn. Tu viens de lire l'intégralité du dossier du candidat.

MISSION : identifier les zones floues ou les informations manquantes, et poser des questions FACTUELLES et NEUTRES pour les clarifier.

${spec[engineId] || ""}

RÈGLES STRICTES (anti-spoiler) :
- 3 à 4 questions maximum.
- Ton neutre, factuel, bienveillant — comme un enquêteur, pas un juge.
- INTERDIT : formuler un avis, signaler un problème, laisser entendre ce qui va ou ne va pas, anticiper le diagnostic.
- Chaque question porte sur un fait manquant ou une ambiguïté réelle du dossier.

Réponds UNIQUEMENT en JSON strict, sans texte autour :
{"questions": ["...", "...", "..."]}`;
}

function promptDiagnostic() {
  return `Tu es un expert en optimisation de profil LinkedIn. Tu produis un DIAGNOSTIC NEUTRE du profil, sous 3 casquettes simultanées.

CASQUETTES :
- recruteur : ${HAT_FOCUS.recruteur}
- seo : ${HAT_FOCUS.seo}
- coach : ${HAT_FOCUS.coach}

RÈGLES STRICTES :
- CONSTAT UNIQUEMENT. Aucune proposition, aucune correction dans cette étape.
- Ton neutre, factuel. Points forts ET points faibles.
- Phrases courtes (max ~15 mots chacune). 1 à 3 items par liste.
- Ajoute une observation libre par section (ce que tu vois hors casquette).

Sections à diagnostiquer : ${SECTIONS.join(" | ")}

Réponds UNIQUEMENT en JSON strict :
{"sections":[{"section":"<nom exact>","casquettes":{"recruteur":{"forts":["..."],"faibles":["..."]},"seo":{"forts":["..."],"faibles":["..."]},"coach":{"forts":["..."],"faibles":["..."]}},"observation":"..."}]}`;
}

function promptPropositions() {
  return `Tu es un expert en optimisation de profil LinkedIn. Tu as déjà produit ton diagnostic neutre. Tu proposes maintenant des CORRECTIONS concrètes.

Pour chaque section : un constat en 1 ligne, une version corrigée concrète et prête à copier-coller (adaptée au secteur, au pays, au niveau et au type d'employeur du candidat), une explication courte (2-3 phrases), un niveau de priorité.

Niveaux : CRITIQUE / IMPORTANT / BONUS.
Sections : ${SECTIONS.join(" | ")}

Réponds UNIQUEMENT en JSON strict :
{"sections":[{"section":"<nom exact>","constat":"...","proposition":"...","explication":"...","priorite":"CRITIQUE|IMPORTANT|BONUS"}]}`;
}

function promptSynthesis() {
  return `Tu es l'arbitre final. Tu reçois les diagnostics et propositions de plusieurs IA (chacune sous 3 casquettes). Tu produis la SYNTHÈSE consolidée, section par section.

Pour chaque section :
- convergences : points sur lesquels 2 IA ou plus s'accordent (texte court).
- divergences : points où les IA diffèrent (texte court) — sans trancher autoritairement.
- version_retenue : la correction consensuelle recommandée, concrète et prête à l'emploi.
- priorite : CRITIQUE (si 2+ IA convergent sur un point fort) / IMPORTANT / BONUS.
- explication : 2-3 phrases claires, sans jargon.

Sections : ${SECTIONS.join(" | ")}

Réponds UNIQUEMENT en JSON strict :
{"resume":"<3 phrases de synthèse globale>","sections":[{"section":"<nom exact>","convergences":["..."],"divergences":["..."],"version_retenue":"...","priorite":"CRITIQUE|IMPORTANT|BONUS","explication":"..."}]}`;
}

/* ------------------------------ UI atoms --------------------------------- */

function Btn({ children, onClick, variant = "solid", disabled, style }) {
  const base = {
    fontFamily: "'Spline Sans', sans-serif", fontWeight: 600, fontSize: 15,
    padding: "13px 26px", borderRadius: 2, cursor: disabled ? "not-allowed" : "pointer",
    transition: "all .18s", letterSpacing: ".01em", opacity: disabled ? 0.4 : 1,
    border: `1.5px solid ${T.ink}`,
  };
  const variants = {
    solid: { background: T.ink, color: T.paper },
    ghost: { background: "transparent", color: T.ink },
    accent: { background: T.accent, color: T.paper, borderColor: T.accent },
  };
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={e => { if (!disabled && variant === "solid") e.currentTarget.style.background = T.accent, e.currentTarget.style.borderColor = T.accent; }}
      onMouseLeave={e => { if (!disabled && variant === "solid") e.currentTarget.style.background = T.ink, e.currentTarget.style.borderColor = T.ink; }}>
      {children}
    </button>
  );
}

function Field({ label, hint, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontFamily: "'Spline Sans', sans-serif", fontSize: 12, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: T.inkSoft, marginBottom: 7 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 12.5, color: T.inkFaint, marginTop: 5, fontFamily: "'Spline Sans', sans-serif" }}>{hint}</div>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "11px 13px", border: `1.5px solid ${T.line}`, borderRadius: 2,
  background: T.card, color: T.ink, fontFamily: "'Spline Sans', sans-serif", fontSize: 14.5, outline: "none",
};

function Input(props) {
  return <input {...props} style={{ ...inputStyle, ...(props.style || {}) }}
    onFocus={e => e.target.style.borderColor = T.accent}
    onBlur={e => e.target.style.borderColor = T.line} />;
}
function Area(props) {
  return <textarea {...props} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, ...(props.style || {}) }}
    onFocus={e => e.target.style.borderColor = T.accent}
    onBlur={e => e.target.style.borderColor = T.line} />;
}
function Select({ value, onChange, options }) {
  return <select value={value} onChange={onChange} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }}>
    <option value="">— choisir —</option>
    {options.map(o => <option key={o} value={o}>{o}</option>)}
  </select>;
}

function Tag({ prio }) {
  const p = PRIO[prio] || PRIO.IMPORTANT;
  return <span style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: p.color, background: p.bg, padding: "4px 10px", borderRadius: 2, border: `1px solid ${p.color}33` }}>{p.label}</span>;
}

function StepDots({ step }) {
  const steps = ["Config", "Intake", "Questions", "Diagnostic", "Synthèse"];
  return (
    <div style={{ display: "flex", gap: 0, alignItems: "center", flexWrap: "wrap" }}>
      {steps.map((s, i) => (
        <React.Fragment key={s}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, fontFamily: "'Spline Sans Mono', monospace", background: i <= step ? T.accent : "transparent", color: i <= step ? T.paper : T.inkFaint, border: `1.5px solid ${i <= step ? T.accent : T.line}` }}>{i + 1}</div>
            <span style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: 12.5, fontWeight: i === step ? 700 : 500, color: i === step ? T.ink : T.inkFaint }}>{s}</span>
          </div>
          {i < steps.length - 1 && <div style={{ width: 26, height: 1.5, background: i < step ? T.accent : T.line, margin: "0 12px" }} />}
        </React.Fragment>
      ))}
    </div>
  );
}

/* =============================== APP ====================================== */

export default function LinkedRx() {
  const [step, setStep] = useState(0);
  const [engines, setEngines] = useState(
    ENGINES.map(e => ({ ...e, enabled: e.id === "claude", key: "" }))
  );
  const active = engines.filter(e => e.enabled && (e.builtIn || e.key.trim()));

  const [d, setD] = useState({
    secteur: "", pays: "", employeur: "", niveau: "", salaire: "", timing: "", cibles: "",
    linkedin: "", cv: "", lettre: "", libre: "",
  });
  const set = (k, v) => setD(p => ({ ...p, [k]: v }));

  const [questions, setQuestions] = useState({});      // {engineId: [..]}
  const [answers, setAnswers] = useState({});          // {engineId-idx: text}
  const [diag, setDiag] = useState({});                // {engineId: {sections}}
  const [props_, setProps] = useState({});             // {engineId: {sections}}
  const [synth, setSynth] = useState(null);
  const [status, setStatus] = useState({});            // {engineId: 'load'|'ok'|err string}
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState("");

  const updEngine = (id, patch) => setEngines(p => p.map(e => e.id === id ? { ...e, ...patch } : e));

  const qaText = useMemo(() => {
    const lines = [];
    active.forEach(e => {
      (questions[e.id] || []).forEach((q, i) => {
        const a = answers[`${e.id}-${i}`];
        if (a && a.trim()) lines.push(`[${e.name}] Q: ${q}\nR: ${a.trim()}`);
      });
    });
    return lines.join("\n\n");
  }, [questions, answers, active]);

  /* -------- Module 1 : génération des questions -------- */
  async function genQuestions() {
    setBusy(true); setPhase("Lecture du dossier par chaque IA…");
    const st = {}; active.forEach(e => st[e.id] = "load"); setStatus(st);
    const base = ctx(d);
    await Promise.all(active.map(async e => {
      try {
        const out = await callEngine(e, promptQuestions(e.id), base, 1200);
        const j = parseJSON(out);
        setQuestions(p => ({ ...p, [e.id]: (j && j.questions) ? j.questions.slice(0, 4) : [] }));
        setStatus(p => ({ ...p, [e.id]: "ok" }));
      } catch (err) {
        setQuestions(p => ({ ...p, [e.id]: [] }));
        setStatus(p => ({ ...p, [e.id]: String(err.message || err) }));
      }
    }));
    setBusy(false); setStep(2);
  }

  /* -------- Module 2 + 3 : diagnostic, propositions, synthèse -------- */
  async function runAudit() {
    setBusy(true); setStep(3);
    const base = ctx({ ...d, qa: qaText });
    const st = {}; active.forEach(e => st[e.id] = "load"); setStatus(st);

    setPhase("Module 2 — Diagnostic croisé…");
    const dg = {};
    await Promise.all(active.map(async e => {
      try {
        const out = await callEngine(e, promptDiagnostic(), base, 4000);
        const j = parseJSON(out);
        if (j && j.sections) { dg[e.id] = j; setStatus(p => ({ ...p, [e.id]: "ok" })); }
        else { setStatus(p => ({ ...p, [e.id]: "réponse non exploitable" })); }
      } catch (err) { setStatus(p => ({ ...p, [e.id]: String(err.message || err) })); }
    }));
    setDiag(dg);

    setPhase("Module 3 — Propositions de chaque IA…");
    const pr = {};
    await Promise.all(active.filter(e => dg[e.id]).map(async e => {
      try {
        const userMsg = base + "\n\nTON DIAGNOSTIC (rappel) :\n" + JSON.stringify(dg[e.id]);
        const out = await callEngine(e, promptPropositions(), userMsg, 4000);
        const j = parseJSON(out);
        if (j && j.sections) pr[e.id] = j;
      } catch { /* keep going */ }
    }));
    setProps(pr);

    setPhase("Synthèse finale — arbitrage consolidé…");
    const arbiter = active.find(e => dg[e.id]) || active[0];
    try {
      const payload = {
        diagnostics: Object.fromEntries(active.filter(e => dg[e.id]).map(e => [e.name, dg[e.id]])),
        propositions: Object.fromEntries(active.filter(e => pr[e.id]).map(e => [e.name, pr[e.id]])),
      };
      const out = await callEngine(arbiter, promptSynthesis(),
        base + "\n\nRÉSULTATS DES IA (JSON) :\n" + JSON.stringify(payload), 4000);
      const j = parseJSON(out);
      if (j) setSynth(j);
    } catch (err) { setSynth({ resume: "Synthèse indisponible : " + (err.message || err), sections: [] }); }

    setBusy(false); setPhase(""); setStep(4);
  }

  /* ------------------------------ RENDER --------------------------------- */
  return (
    <div style={{ minHeight: "100vh", background: T.paper, color: T.ink, fontFamily: "'Spline Sans', sans-serif", backgroundImage: `radial-gradient(${T.lineSoft} 0.6px, transparent 0.6px)`, backgroundSize: "22px 22px" }}>
      <style>{FONTS}</style>

      {/* HEADER */}
      <header style={{ borderBottom: `1.5px solid ${T.ink}`, background: T.paper, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "16px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 27, letterSpacing: "-.02em" }}>LinkedRx</span>
            <span style={{ fontSize: 12, color: T.inkFaint, letterSpacing: ".04em" }}>audit IA · profil LinkedIn</span>
          </div>
          <StepDots step={step} />
        </div>
      </header>

      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "38px 28px 80px", animation: "lrx-fade .4s ease" }}>

        {/* ============ STEP 0 — CONFIG ============ */}
        {step === 0 && (
          <div>
            <SectionTitle kicker="Étape 1" title="Configuration des moteurs IA"
              sub="Active au moins 2 IA pour le benchmark croisé. Colle la clé API de chaque IA activée. Le nom du modèle est modifiable si l'API évolue." />
            <div style={{ display: "grid", gap: 14, marginTop: 28 }}>
              {engines.map(e => (
                <div key={e.id} style={{ border: `1.5px solid ${e.enabled ? e.color : T.line}`, borderRadius: 3, background: T.card, padding: "16px 18px", transition: "border-color .2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <button onClick={() => updEngine(e.id, { enabled: !e.enabled })}
                      style={{ width: 44, height: 24, borderRadius: 20, border: "none", cursor: "pointer", background: e.enabled ? e.color : T.line, position: "relative", transition: "background .2s", flexShrink: 0 }}>
                      <span style={{ position: "absolute", top: 2, left: e.enabled ? 22 : 2, width: 20, height: 20, borderRadius: "50%", background: T.paper, transition: "left .2s" }} />
                    </button>
                    <div style={{ width: 11, height: 11, borderRadius: "50%", background: e.color, flexShrink: 0 }} />
                    <div style={{ minWidth: 130 }}>
                      <div style={{ fontWeight: 700, fontSize: 16, fontFamily: "'Fraunces', serif" }}>{e.name}</div>
                      <div style={{ fontSize: 12, color: T.inkFaint }}>{e.vendor}</div>
                    </div>
                    {e.builtIn ? (
                      <div style={{ fontSize: 12.5, color: T.good, fontWeight: 600, background: "#E1EFE7", padding: "5px 11px", borderRadius: 2 }}>✓ Clé gérée par l'environnement</div>
                    ) : (
                      <Input placeholder={`Clé API — ${e.keyUrl}`} value={e.key} type="password"
                        onChange={ev => updEngine(e.id, { key: ev.target.value })}
                        style={{ flex: 1, minWidth: 200, opacity: e.enabled ? 1 : 0.5 }} />
                    )}
                    <Input value={e.model} onChange={ev => updEngine(e.id, { model: ev.target.value })}
                      style={{ width: 210, fontFamily: "'Spline Sans Mono', monospace", fontSize: 12.5, opacity: e.enabled ? 1 : 0.5 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, padding: "14px 18px", background: T.paper2, border: `1px solid ${T.line}`, borderRadius: 3, fontSize: 13.5, color: T.inkSoft, lineHeight: 1.55 }}>
              <strong style={{ color: T.ink }}>{active.length}</strong> moteur{active.length > 1 ? "s" : ""} actif{active.length > 1 ? "s" : ""} · {active.length * 3} diagnostics croisés ({active.length} IA × 3 casquettes).
              {active.length < 2 && <span style={{ color: T.warn }}> — 2+ recommandé pour le vrai benchmark croisé.</span>}
              <div style={{ marginTop: 6, fontSize: 12.5, color: T.inkFaint }}>Les appels IA passent par un backend sécurisé (Next.js) : aucune clé n'est exposée côté navigateur, pas de blocage CORS.</div>
            </div>
            <div style={{ marginTop: 30, display: "flex", justifyContent: "flex-end" }}>
              <Btn onClick={() => setStep(1)} disabled={active.length < 1} variant="accent">Continuer vers l'intake →</Btn>
            </div>
          </div>
        )}

        {/* ============ STEP 1 — INTAKE ============ */}
        {step === 1 && (
          <div>
            <SectionTitle kicker="Étape 2 · Module 1" title="Présentation du candidat"
              sub="Renseigne tes paramètres et colle le contenu de ton profil. Plus c'est complet, plus le diagnostic est précis." />

            <div style={{ marginTop: 28, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 26px" }}>
              <Field label="Secteur professionnel cible">
                <Select value={d.secteur} onChange={e => set("secteur", e.target.value)}
                  options={["Pharmaceutique / Biotech", "Finance / Banque", "Tech / IT", "Droit / Juridique", "Ingénierie", "Santé / Médical", "Marketing / Communication", "Conseil", "Industrie", "Autre"]} />
              </Field>
              <Field label="Pays / région cible">
                <Input value={d.pays} onChange={e => set("pays", e.target.value)} placeholder="Ex : Canada (Québec), France, Maroc…" />
              </Field>
              <Field label="Type d'employeur visé">
                <Select value={d.employeur} onChange={e => set("employeur", e.target.value)}
                  options={["Grande entreprise", "PME / ETI", "Cabinet spécialisé", "Startup", "ONG / Association", "Secteur public", "Indifférent"]} />
              </Field>
              <Field label="Niveau de poste">
                <Select value={d.niveau} onChange={e => set("niveau", e.target.value)}
                  options={["Junior", "Confirmé", "Senior", "Manager", "Directeur", "Cadre dirigeant"]} />
              </Field>
              <Field label="Prétentions salariales">
                <Input value={d.salaire} onChange={e => set("salaire", e.target.value)} placeholder="Ex : 90–110 k$ CAD" />
              </Field>
              <Field label="Timing de recherche">
                <Select value={d.timing} onChange={e => set("timing", e.target.value)}
                  options={["Immédiat", "Dans 3 mois", "Dans 6 mois", "Veille passive"]} />
              </Field>
            </div>
            <Field label="Employeurs / cabinets ciblés (optionnel)">
              <Input value={d.cibles} onChange={e => set("cibles", e.target.value)} placeholder="Ex : Pfizer, Roche, IQVIA…" />
            </Field>

            <div style={{ height: 1, background: T.line, margin: "10px 0 24px" }} />

            <Field label="Contenu de ton profil LinkedIn"
              hint="Colle ton titre, ton « À propos », tes expériences, tes compétences. (Le parsing automatique du ZIP LinkedIn arrive au déploiement.)">
              <Area rows={7} value={d.linkedin} onChange={e => set("linkedin", e.target.value)}
                placeholder={"TITRE : ...\nÀ PROPOS : ...\nEXPÉRIENCES : ...\nCOMPÉTENCES : ..."} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 26px" }}>
              <Field label="CV (texte)"><Area rows={5} value={d.cv} onChange={e => set("cv", e.target.value)} placeholder="Colle le texte de ton CV…" /></Field>
              <Field label="Lettre de motivation (optionnel)"><Area rows={5} value={d.lettre} onChange={e => set("lettre", e.target.value)} placeholder="Colle ta lettre…" /></Field>
            </div>
            <Field label="Ton texte libre" hint="Exprime-toi librement : ton parcours, tes ambitions, tes contraintes, ton ressenti.">
              <Area rows={5} value={d.libre} onChange={e => set("libre", e.target.value)} placeholder="Je cherche à évoluer vers… ; ce qui compte pour moi…" />
            </Field>

            <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between" }}>
              <Btn onClick={() => setStep(0)} variant="ghost">← Config</Btn>
              <Btn onClick={genQuestions} variant="accent" disabled={busy || !d.linkedin.trim()}>
                {busy ? "Lecture en cours…" : "Les IA lisent & posent leurs questions →"}
              </Btn>
            </div>
            {busy && <Loader phase={phase} engines={active} status={status} />}
          </div>
        )}

        {/* ============ STEP 2 — QUESTIONS ============ */}
        {step === 2 && (
          <div>
            <SectionTitle kicker="Module 1 · clarification" title="Les questions de chaque IA"
              sub="Chaque IA pose ses propres questions — neutres, sans révéler le diagnostic. Réponds-y pour affiner l'analyse. (Tu peux laisser vide ce que tu ignores.)" />
            <div style={{ display: "grid", gap: 18, marginTop: 26 }}>
              {active.map(e => (
                <div key={e.id} style={{ border: `1.5px solid ${e.color}`, borderRadius: 3, background: T.card, overflow: "hidden" }}>
                  <div style={{ background: e.color, color: T.paper, padding: "10px 16px", display: "flex", alignItems: "center", gap: 9, fontWeight: 600 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.paper }} /> {e.name} · {e.vendor}
                    {status[e.id] && status[e.id] !== "ok" && <span style={{ marginLeft: "auto", fontSize: 11.5, opacity: .9 }}>⚠ {status[e.id]}</span>}
                  </div>
                  <div style={{ padding: "16px 18px" }}>
                    {(questions[e.id] || []).length === 0 && <div style={{ color: T.inkFaint, fontSize: 13.5 }}>Aucune question générée.</div>}
                    {(questions[e.id] || []).map((q, i) => (
                      <div key={i} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 14.5, fontWeight: 500, marginBottom: 6, lineHeight: 1.45 }}>
                          <span style={{ fontFamily: "'Spline Sans Mono', monospace", color: e.color, fontWeight: 700, marginRight: 7 }}>Q{i + 1}</span>{q}
                        </div>
                        <Area rows={2} value={answers[`${e.id}-${i}`] || ""} onChange={ev => setAnswers(p => ({ ...p, [`${e.id}-${i}`]: ev.target.value }))} placeholder="Ta réponse…" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 26, display: "flex", justifyContent: "space-between" }}>
              <Btn onClick={() => setStep(1)} variant="ghost">← Intake</Btn>
              <Btn onClick={runAudit} variant="accent" disabled={busy}>Lancer le diagnostic croisé →</Btn>
            </div>
          </div>
        )}

        {/* ============ STEP 3 — RUNNING ============ */}
        {step === 3 && (
          <div>
            <SectionTitle kicker="Modules 2 & 3" title="Analyse en cours" sub="Les IA travaillent en parallèle." />
            <Loader phase={phase} engines={active} status={status} big />
          </div>
        )}

        {/* ============ STEP 4 — RESULTS ============ */}
        {step === 4 && (
          <Results d={d} active={active} diag={diag} props_={props_} synth={synth} onRestart={() => { setStep(0); setDiag({}); setProps({}); setSynth(null); setQuestions({}); setAnswers({}); }} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------ helpers UI ------------------------------- */

function SectionTitle({ kicker, title, sub }) {
  return (
    <div>
      <div style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: T.accent, marginBottom: 8 }}>{kicker}</div>
      <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 34, margin: 0, letterSpacing: "-.02em", lineHeight: 1.1 }}>{title}</h1>
      {sub && <p style={{ color: T.inkSoft, fontSize: 15, lineHeight: 1.55, marginTop: 12, maxWidth: 760 }}>{sub}</p>}
    </div>
  );
}

function Loader({ phase, engines, status, big }) {
  return (
    <div style={{ marginTop: 26, padding: big ? "30px" : "20px", background: T.card, border: `1.5px solid ${T.line}`, borderRadius: 3 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
        <div style={{ width: 18, height: 18, border: `2.5px solid ${T.line}`, borderTopColor: T.accent, borderRadius: "50%", animation: "lrx-spin .8s linear infinite" }} />
        <span style={{ fontWeight: 600, fontSize: 15 }}>{phase || "Traitement…"}</span>
      </div>
      <div style={{ height: 3, background: T.lineSoft, borderRadius: 2, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ width: "30%", height: "100%", background: T.accent, animation: "lrx-bar 1.3s ease-in-out infinite" }} />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {engines.map(e => {
          const s = status[e.id];
          const dot = s === "ok" ? T.good : (s && s !== "load") ? T.crit : e.color;
          return (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: dot, animation: s === "load" ? "lrx-pulse 1s infinite" : "none" }} />
              <strong style={{ minWidth: 80 }}>{e.name}</strong>
              <span style={{ color: s === "ok" ? T.good : (s && s !== "load") ? T.crit : T.inkFaint }}>
                {s === "ok" ? "terminé" : s === "load" ? "en cours…" : s ? s : "en attente"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ RESULTS ---------------------------------- */

function Results({ d, active, diag, props_, synth, onRestart }) {
  const [si, setSi] = useState(0);
  const [view, setView] = useState("synth"); // synth | matrix
  const section = SECTIONS[si];

  const synthSec = (synth?.sections || []).find(s => (s.section || "").includes(section.split(" ")[0])) || (synth?.sections || [])[si];

  function diagFor(engineId) {
    const j = diag[engineId];
    if (!j) return null;
    return (j.sections || []).find(s => (s.section || "").includes(section.split(" ")[0])) || (j.sections || [])[si];
  }
  function propFor(engineId) {
    const j = props_[engineId];
    if (!j) return null;
    return (j.sections || []).find(s => (s.section || "").includes(section.split(" ")[0])) || (j.sections || [])[si];
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <SectionTitle kicker="Résultats" title="Audit consolidé du profil"
          sub={synth?.resume || "Navigue section par section. Bascule entre la synthèse consolidée et la matrice détaillée par IA."} />
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant={view === "synth" ? "accent" : "ghost"} onClick={() => setView("synth")} style={{ padding: "9px 16px", fontSize: 13.5 }}>Synthèse</Btn>
          <Btn variant={view === "matrix" ? "accent" : "ghost"} onClick={() => setView("matrix")} style={{ padding: "9px 16px", fontSize: 13.5 }}>Matrice IA</Btn>
        </div>
      </div>

      {/* SLIDE NAV */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", margin: "26px 0 20px" }}>
        {SECTIONS.map((s, i) => (
          <button key={s} onClick={() => setSi(i)}
            style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: 12.5, fontWeight: i === si ? 700 : 500, padding: "7px 13px", borderRadius: 2, cursor: "pointer", border: `1.5px solid ${i === si ? T.ink : T.line}`, background: i === si ? T.ink : "transparent", color: i === si ? T.paper : T.inkSoft }}>
            {i + 1}. {s.replace(/ \(.+\)| «.+»/, "").trim()}
          </button>
        ))}
      </div>

      {/* SLIDE */}
      <div key={si + view} style={{ animation: "lrx-fade .3s ease", border: `1.5px solid ${T.ink}`, borderRadius: 4, background: T.card, overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1.5px solid ${T.line}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.paper2 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 13, color: T.accent }}>{String(si + 1).padStart(2, "0")} / {SECTIONS.length}</span>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 23, margin: 0 }}>{section}</h2>
          </div>
          {view === "synth" && synthSec?.priorite && <Tag prio={synthSec.priorite} />}
        </div>

        <div style={{ padding: "24px" }}>
          {view === "synth" ? (
            <SynthView sec={synthSec} />
          ) : (
            <MatrixView active={active} diagFor={diagFor} propFor={propFor} />
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 24px", borderTop: `1.5px solid ${T.line}` }}>
          <Btn variant="ghost" onClick={() => setSi(Math.max(0, si - 1))} disabled={si === 0} style={{ padding: "9px 16px" }}>← Précédent</Btn>
          <Btn variant="ghost" onClick={() => setSi(Math.min(SECTIONS.length - 1, si + 1))} disabled={si === SECTIONS.length - 1} style={{ padding: "9px 16px" }}>Suivant →</Btn>
        </div>
      </div>

      <div style={{ marginTop: 26, display: "flex", justifyContent: "center" }}>
        <Btn variant="ghost" onClick={onRestart}>↺ Nouvel audit</Btn>
      </div>
    </div>
  );
}

function SynthView({ sec }) {
  if (!sec) return <div style={{ color: T.inkFaint }}>Synthèse indisponible pour cette section.</div>;
  return (
    <div style={{ display: "grid", gap: 20 }}>
      {sec.convergences?.length > 0 && (
        <Block title="Convergences" color={T.crit} note="Ce sur quoi les IA s'accordent">
          {sec.convergences.map((c, i) => <Li key={i} text={c} />)}
        </Block>
      )}
      {sec.divergences?.length > 0 && (
        <Block title="Divergences" color={T.warn} note="Points de désaccord — à toi de choisir">
          {sec.divergences.map((c, i) => <Li key={i} text={c} bullet="◇" color={T.warn} />)}
        </Block>
      )}
      {sec.version_retenue && (
        <div style={{ background: "#EAF2EC", border: `1.5px solid ${T.good}`, borderRadius: 3, padding: "16px 18px" }}>
          <div style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: T.good, fontWeight: 700, marginBottom: 9 }}>✓ Version recommandée — prête à copier</div>
          <div style={{ fontSize: 15, lineHeight: 1.55, color: T.ink, whiteSpace: "pre-wrap", fontFamily: "'Fraunces', serif" }}>{sec.version_retenue}</div>
        </div>
      )}
      {sec.explication && (
        <div style={{ fontSize: 14, color: T.inkSoft, lineHeight: 1.6, borderLeft: `3px solid ${T.line}`, paddingLeft: 14 }}>
          <strong style={{ color: T.ink }}>Pourquoi&nbsp;:</strong> {sec.explication}
        </div>
      )}
    </div>
  );
}

function MatrixView({ active, diagFor, propFor }) {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {active.map(e => {
        const dg = diagFor(e.id);
        const pr = propFor(e.id);
        if (!dg && !pr) return (
          <div key={e.id} style={{ border: `1px solid ${T.line}`, borderRadius: 3, padding: 14, color: T.inkFaint, fontSize: 13.5 }}>
            <strong style={{ color: e.color }}>{e.name}</strong> — pas de données pour cette section.
          </div>
        );
        return (
          <div key={e.id} style={{ border: `1.5px solid ${e.color}`, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ background: e.color, color: T.paper, padding: "8px 14px", fontWeight: 600, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
              <span>{e.name}</span>{pr?.priorite && <span style={{ fontSize: 11, opacity: .92 }}>{pr.priorite}</span>}
            </div>
            <div style={{ padding: "14px 16px", display: "grid", gap: 12 }}>
              {dg?.casquettes && HATS.map(h => {
                const c = dg.casquettes[h.id]; if (!c) return null;
                return (
                  <div key={h.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 12, alignItems: "start" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: T.inkSoft, paddingTop: 2 }}>{h.icon} {h.label}</div>
                    <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                      {(c.forts || []).map((x, i) => <div key={"f" + i} style={{ color: T.good }}>+ {x}</div>)}
                      {(c.faibles || []).map((x, i) => <div key={"w" + i} style={{ color: T.crit }}>− {x}</div>)}
                    </div>
                  </div>
                );
              })}
              {dg?.observation && <div style={{ fontSize: 13, color: T.inkSoft, fontStyle: "italic", borderTop: `1px solid ${T.lineSoft}`, paddingTop: 10 }}>👁 {dg.observation}</div>}
              {pr?.proposition && (
                <div style={{ background: T.paper2, borderRadius: 3, padding: "12px 14px", marginTop: 4 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: e.color, marginBottom: 6 }}>Proposition</div>
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{pr.proposition}</div>
                  {pr.explication && <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 8 }}>{pr.explication}</div>}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Block({ title, color, note, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 9 }}>
        <span style={{ fontFamily: "'Spline Sans Mono', monospace", fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color, fontWeight: 700 }}>{title}</span>
        <span style={{ fontSize: 12, color: T.inkFaint }}>{note}</span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>{children}</div>
    </div>
  );
}
function Li({ text, bullet = "■", color = T.crit }) {
  return <div style={{ display: "flex", gap: 9, fontSize: 14.5, lineHeight: 1.5 }}><span style={{ color, fontSize: 9, paddingTop: 5 }}>{bullet}</span><span>{text}</span></div>;
}
