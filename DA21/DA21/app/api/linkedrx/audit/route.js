import prompts from '@/lib/prompts.json';

async function callAI(model, apiKey, candidateData, promptConfig) {
  if (!promptConfig) throw new Error(`Unknown model: ${model}`);

  const userPrompt = promptConfig.user_prompt_template
    .replace('{besoin}', candidateData.besoin)
    .replace('{profil_linkedin}', candidateData.profil_linkedin)
    .replace('{cv}', candidateData.cv)
    .replace('{lettre_motivation}', candidateData.lettre_motivation)
    .replace('{contexte}', candidateData.contexte);

  const provider = promptConfig.provider.toLowerCase();

  if (provider === 'anthropic') {
    return callAnthropicAPI(apiKey, userPrompt, promptConfig);
  } else if (provider === 'openai') {
    return callOpenAIAPI(apiKey, userPrompt, promptConfig);
  } else if (provider === 'google') {
    return callGoogleAPI(apiKey, userPrompt, promptConfig);
  }

  throw new Error(`Unknown provider: ${provider}`);
}

async function callAnthropicAPI(apiKey, userPrompt, promptConfig) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: promptConfig.api_config.model,
      max_tokens: promptConfig.api_config.max_tokens,
      system: promptConfig.system_prompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Invalid response format', raw: content };
  } catch {
    return { error: 'JSON parse error', raw: content };
  }
}

async function callOpenAIAPI(apiKey, userPrompt, promptConfig) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: promptConfig.api_config.model,
      max_tokens: promptConfig.api_config.max_tokens,
      messages: [
        { role: 'system', content: promptConfig.system_prompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Invalid response format', raw: content };
  } catch {
    return { error: 'JSON parse error', raw: content };
  }
}

async function callGoogleAPI(apiKey, userPrompt, promptConfig) {
  const fullPrompt = `${promptConfig.system_prompt}\n\n${userPrompt}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: fullPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: promptConfig.api_config.max_tokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google API error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.candidates[0].content.parts[0].text;

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { error: 'Invalid response format', raw: content };
  } catch {
    return { error: 'JSON parse error', raw: content };
  }
}

function generateSynthesis(diagnostics) {
  const verdicts = [];
  if (diagnostics.ia1?.verdict?.verdict) verdicts.push(`Claude: ${diagnostics.ia1.verdict.verdict}`);
  if (diagnostics.ia2?.verdict?.verdict) verdicts.push(`GPT-4O: ${diagnostics.ia2.verdict.verdict}`);
  if (diagnostics.ia3?.verdict?.verdict) verdicts.push(`Gemini: ${diagnostics.ia3.verdict.verdict}`);

  const allVerdicts = verdicts.length;
  const yesVerdicts = verdicts.filter((v) => v.includes('Oui')).length;

  return {
    summary: `Synthèse: ${yesVerdicts}/${allVerdicts} auditeurs recommandent ce profil.`,
    consensus: yesVerdicts / allVerdicts >= 0.66 ? 'GO' : yesVerdicts / allVerdicts >= 0.33 ? 'MAYBE' : 'NO GO',
  };
}

export async function POST(req) {
  try {
    const { candidateData, iaConfig } = await req.json();

    if (!candidateData || !iaConfig) {
      return new Response(JSON.stringify({ success: false, error: 'Missing candidateData or iaConfig' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!iaConfig.ia1 || !iaConfig.ia1.model || !iaConfig.ia1.apiKey) {
      return new Response(JSON.stringify({ success: false, error: 'IA1 configuration is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const apiCalls = [];

    apiCalls.push(
      callAI(iaConfig.ia1.model, iaConfig.ia1.apiKey, candidateData, prompts[iaConfig.ia1.model])
        .then((result) => ({ ia1: result }))
        .catch((err) => ({ ia1: { error: err.message } }))
    );

    if (iaConfig.ia2?.enabled && iaConfig.ia2?.apiKey) {
      apiCalls.push(
        callAI(iaConfig.ia2.model, iaConfig.ia2.apiKey, candidateData, prompts[iaConfig.ia2.model])
          .then((result) => ({ ia2: result }))
          .catch((err) => ({ ia2: { error: err.message } }))
      );
    } else {
      apiCalls.push(Promise.resolve({ ia2: null }));
    }

    if (iaConfig.ia3?.enabled && iaConfig.ia3?.apiKey) {
      apiCalls.push(
        callAI(iaConfig.ia3.model, iaConfig.ia3.apiKey, candidateData, prompts[iaConfig.ia3.model])
          .then((result) => ({ ia3: result }))
          .catch((err) => ({ ia3: { error: err.message } }))
      );
    } else {
      apiCalls.push(Promise.resolve({ ia3: null }));
    }

    const results = await Promise.all(apiCalls);
    const diagnostics = Object.assign({}, ...results);
    const synthesis = generateSynthesis(diagnostics);

    return new Response(
      JSON.stringify({
        success: true,
        diagnostics,
        synthesis,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Audit API error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
