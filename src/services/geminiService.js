/**
 * Serviço de Integração Multimodal com a API Google Gemini
 * com áudio bruto via inlineData base64 para avaliação fonética e conversação interativa.
 *
 * SEGURANÇA (Fase 1):
 * - A única chave usada é a CHAVE PESSOAL que o próprio usuário cola em Configurações.
 *   Ela fica no localStorage deste navegador, que NÃO é armazenamento secreto: qualquer
 *   script executado nesta origem (extensões, XSS) consegue lê-la. É aceitável apenas
 *   para uso pessoal, com a chave do próprio usuário, idealmente restrita por referrer/cota.
 * - Nenhuma credencial é lida de `import.meta.env`: toda variável `VITE_*` é embutida no
 *   bundle público em `dist/`. Uma credencial privada de servidor NUNCA deve ir para o cliente;
 *   numa versão multiusuário as chamadas devem passar por um backend/proxy (ver README).
 * - A chave é enviada no header `x-goog-api-key`, e não na URL (evita vazamento em logs/histórico).
 */

/**
 * Modelos verificados na documentação oficial (ai.google.dev, nov/2026):
 * - gemini-3.8-flash: estável (GA), modelo Flash atual.
 * - gemini-3.6-flash: geração anterior, ainda disponível para produção.
 * - gemini-2.5-flash: estável, fallback de longo prazo.
 * Removidos: gemini-3.5-flash e gemini-3.7-flash (descontinuados, apenas redirecionados),
 * gemini-3-flash-preview (preview) e gemini-flash-latest (alias móvel, comportamento imprevisível).
 */
import {
  GeminiResponseError,
  extractCandidateText,
  parseJsonLoose,
  normalizeCamilleAudio,
  normalizeTCFOral,
  normalizeTCFWritten,
  normalizeListeningQuestion,
  normalizeReadingQuestion,
  normalizeShadowing
} from './geminiValidation';

export { GeminiResponseError };

export const GEMINI_CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash'
];

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const USER_KEY_STORAGE = 'user_gemini_api_key';

/**
 * Lê a chave PESSOAL do Gemini configurada pelo usuário neste navegador.
 * Não existe mais fallback para variáveis de ambiente.
 */
export function getGeminiApiKey() {
  if (typeof window === 'undefined') return '';
  try {
    const userKey = localStorage.getItem(USER_KEY_STORAGE);
    return userKey && userKey.trim() ? userKey.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Salva ou remove a chave pessoal da API Gemini no localStorage do navegador
 */
export function setGeminiApiKey(key) {
  if (typeof window !== 'undefined') {
    if (key && key.trim()) {
      localStorage.setItem('user_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('user_gemini_api_key');
    }
  }
}

/**
 * Limpa parâmetros como ';codecs=opus' e normaliza para MIME Types aceitos pela API REST do Gemini:
 * 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mp3'
 */
export function cleanAudioMimeType(mimeType) {
  if (!mimeType) return 'audio/webm';
  const clean = mimeType.split(';')[0].trim().toLowerCase();
  if (clean.includes('webm')) return 'audio/webm';
  if (clean.includes('mp4') || clean.includes('m4a')) return 'audio/mp4';
  if (clean.includes('ogg')) return 'audio/ogg';
  if (clean.includes('wav')) return 'audio/wav';
  if (clean.includes('mp3') || clean.includes('mpeg')) return 'audio/mp3';
  return 'audio/webm';
}

/**
 * Utilitários de chamada.
 */
/** Remove qualquer ocorrência da chave de mensagens de erro antes de logar/exibir. */
function redactKey(text, apiKey) {
  if (!text) return '';
  let out = String(text);
  if (apiKey) out = out.split(apiKey).join('[chave-oculta]');
  return out.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[chave-oculta]');
}

/**
 * Chamada única a um modelo. Exportada para o teste de conexão em Configurações.
 * Retorna `{ ok, status, data?, errorMessage? }` sem lançar em erros HTTP.
 */
export async function requestGeminiModel(model, payload, apiKey) {
  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    },
    body: JSON.stringify(payload)
  });

  if (res.ok) {
    return { ok: true, status: res.status, data: await res.json() };
  }

  const errorText = await res.text().catch(() => '');
  let errorMessage = `HTTP ${res.status}`;
  try {
    const jsonErr = JSON.parse(errorText);
    if (jsonErr.error?.message) {
      errorMessage = `HTTP ${res.status} (${jsonErr.error.status || 'ERROR'}): ${jsonErr.error.message}`;
    }
  } catch {
    if (errorText) errorMessage = `HTTP ${res.status}: ${errorText.slice(0, 300)}`;
  }
  return { ok: false, status: res.status, errorMessage: redactKey(errorMessage, apiKey) };
}

/**
 * Executa chamada à API Gemini com fallback entre os modelos candidatos.
 * - 404 (modelo indisponível), 429 (cota/limite) e 5xx: tenta o próximo modelo.
 * - 400/401/403 (requisição inválida, chave inválida/sem permissão): erro definitivo.
 * - Falha de rede: tenta o próximo modelo.
 */
async function callGeminiApi(payload, apiKey) {
  if (!apiKey) {
    throw new Error("Chave da API Gemini não configurada.");
  }

  let lastError = null;

  for (const model of GEMINI_CANDIDATE_MODELS) {
    let result;
    try {
      result = await requestGeminiModel(model, payload, apiKey);
    } catch (networkErr) {
      lastError = new Error(`Falha de rede ao chamar ${model}: ${redactKey(networkErr?.message, apiKey)}`);
      console.warn('[Gemini API]', lastError.message);
      continue;
    }

    if (result.ok) return result.data;

    const fatal = [400, 401, 403].includes(result.status);
    lastError = new Error(result.errorMessage);
    lastError.status = result.status;
    if (fatal) {
      console.error(`[Gemini API] Erro definitivo no modelo ${model}:`, result.errorMessage);
      throw lastError;
    }
    console.warn(`[Gemini API] Modelo ${model} indisponível (${result.errorMessage}). Tentando alternativo...`);
  }

  console.error("[Gemini API] Todos os modelos candidatos falharam:", lastError?.message);
  throw lastError || new Error("Falha ao comunicar com a API do Google Gemini.");
}

/** Extrai, faz parse e valida a resposta JSON estruturada. */
function parseStructured(apiResult, normalizer, ...args) {
  const raw = extractCandidateText(apiResult);
  if (!raw) {
    const reason = apiResult?.candidates?.[0]?.finishReason || apiResult?.promptFeedback?.blockReason;
    throw new GeminiResponseError(
      `A API Gemini não retornou conteúdo${reason ? ` (motivo: ${reason})` : ''}.`
    );
  }
  return normalizer(parseJsonLoose(raw), ...args);
}

/**
 * Envia mensagem em texto para a tutora Prof. Camille
 */
export async function sendCamilleChatMessage({ message, history = [], stage = 3, stagePrompt = "" }) {
  const apiKey = getGeminiApiKey();

  // Modo offline / sem chave
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 600));
    return `🇫🇷 C'est un bon début ! Tu t'exprimes déjà en français. Peux-tu me décrire davantage ton projet d'immigration au Canada ?\n\n🇧🇷 Dica da Camille: Você está no modo offline (sem chave Gemini). Para conversas inteligentes e correções em tempo real, configure sua chave no menu de Configurações (⚙️)!`;
  }

  const systemInstruction = `Você é Camille, uma professora canadense de Montréal especialista em ensinar brasileiros do zero ao nível B2 para o TCF Canada.
${stagePrompt || "Converse naturalmente em francês, adaptando a dificuldade ao nível do aluno."}
Formate sempre sua resposta em dois blocos claros separados por uma quebra de linha:
🇫🇷 [Sua resposta e próxima pergunta em francês natural com sotaque canadense/internacional]
🇧🇷 [Correção gentil da mensagem do aluno + tradução rápida ou dica de vocabulário em português]`;

  const chatContents = [
    ...history.slice(-6).map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.text }]
    })),
    { role: 'user', parts: [{ text: message }] }
  ];

  try {
    const result = await callGeminiApi({
      contents: chatContents,
      systemInstruction: { parts: [{ text: systemInstruction }] }
    }, apiKey);

    const reply = extractCandidateText(result);
    if (reply) return reply;
    throw new Error("A API Gemini retornou uma resposta sem texto.");
  } catch (err) {
    console.error("[sendCamilleChatMessage] Erro detalhado:", err);
    throw err;
  }
}

/**
 * Envia Áudio Bruto do aluno para a Prof. Camille (Multimodal)
 * Transcreve palavra por palavra com fidelidade estrita.
 */
export async function sendAudioToCamille({ base64Audio, mimeType = 'audio/webm', history = [], stage = 3, stagePrompt = "" }) {
  const apiKey = getGeminiApiKey();

  // Modo offline / sem chave
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 800));
    return {
      transcription: "[Modo Offline - Chave Gemini não configurada]",
      replyText: `🇫🇷 Bonjour ! J'ai bien reçu ton enregistrement audio. Pour que je puisse écouter ta vraie voix et analyser ta prononciation en temps réel, connecte ta clé Google Gemini dans les paramètres (⚙️) !\n\n🇧🇷 Modo Offline Ativo: Cole sua chave no menu de Configurações (⚙️) na barra superior para ativar a inteligência fonética multimodal.`,
      phoneticTip: "Dica geral: Ao praticar francês, foque em articular bem as vogais nasais (AN, EN, IN, ON) e ligar as palavras (liaisons)."
    };
  }

  if (!base64Audio) {
    throw new Error("Nenhum áudio foi gravado para envio.");
  }

  const cleanMime = cleanAudioMimeType(mimeType);

  const systemInstruction = `Você é Camille, uma professora de francês canadense de Montréal especializada no TCF Canada.
O aluno acabou de enviar uma gravação de áudio real do microfone.

REGRAS CRÍTICAS E OBRIGATÓRIAS (NUNCA VIOLE):
1. No campo "transcription" (ou "userTranscription"), transcreva palavra por palavra EXATAMENTE o que o usuário falou no áudio.
2. Se o áudio estiver inaudível, vazio, apenas com ruído/silêncio, ou se o usuário falou em português ou sons desconexos, a transcrição DEVE relatar fielmente a verdade (ex: "[Áudio inaudível / ruído]", "[Silêncio]", "[Falou em português: ...]").
3. NUNCA, SOB NENHUMA HIPÓTESE, INVENTE uma frase em francês que o usuário não pronunciou! Se ele disse apenas 'oi' ou nada, transcreva isso.
4. No campo "replyText", formule sua resposta em francês e português:
   - Se o usuário falou francês: responda em francês caloroso continuando a conversa e, no parágrafo seguinte com 🇧🇷, forneça uma correção amigável em português.
   - Se o áudio foi inaudível, com ruído ou em português: responda gentilmente dizendo que não conseguiu ouvir com clareza ou peça em francês para ele gravar novamente dizendo uma frase em francês.
5. No campo "phoneticTip": dê 1 dica prática e real em português baseada estritamente nos sons emitidos no áudio (ou uma orientação prática se o áudio não foi compreensível).`;

  const schema = {
    type: "OBJECT",
    properties: {
      transcription: { type: "STRING" },
      userTranscription: { type: "STRING" },
      replyText: { type: "STRING" },
      phoneticTip: { type: "STRING" }
    },
    propertyOrdering: ["transcription", "replyText", "phoneticTip"]
  };

  try {
    const result = await callGeminiApi({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Audio
              }
            },
            {
              text: `Ouça o áudio gravado pelo aluno e responda estritamente no formato JSON solicitado.`
            }
          ]
        }
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, apiKey);

    return parseStructured(result, normalizeCamilleAudio);
  } catch (err) {
    console.error("[sendAudioToCamille] Erro detalhado ao processar áudio com Gemini:", err);
    throw err;
  }
}

/**
 * Avaliação Oficial de Produção Oral em Áudio no Simulador TCF Canada (Multimodal)
 */
export async function evaluateTCFOralAudio({ base64Audio, mimeType = 'audio/webm', prompt, task = 1 }) {
  const apiKey = getGeminiApiKey();

  // Modo offline / sem chave
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 1000));
    return {
      transcription: "[Modo Simulado / Sem Chave Gemini] Configure sua chave no topo (⚙️) para transcrição real.",
      score20: "12/20",
      nclcLevel: "NCLC 6",
      cefrLevel: "B1",
      phoneticAnalysis: {
        nasalVowels: "No modo offline, esta é uma análise demonstrativa. Pratique a ressonância das vogais nasais an, en, in, on.",
        liaisonsAndElisions: "Lembre-se de fazer as ligações obrigatórias após pronomes e artigos.",
        rhythmAndIntonation: "Mantenha o ritmo silábico regular com acento tônico na última sílaba do grupo rítmico.",
        uvularR: "O 'R' francês é produzido na garganta (uvular), sem rolar a ponta da língua.",
        pronunciationScore: 75
      },
      strengths: [
        "Gravação enviada com sucesso no simulador.",
        "Para avaliação fonética real por IA do Google, conecte sua Gemini API Key."
      ],
      corrections: [
        {
          original: "Exemplo demonstrativo",
          corrected: "Exemple de démonstration",
          explanation: "Ative a chave no menu de Configurações para correções específicas da sua voz."
        }
      ],
      upgradedResponse: "Bonjour. Je me présente : je m'appelle Lucas, j'ai trente-deux ans et j'exerce le métier d'ingénieur en informatique au Brésil. Actuellement, je prépare le TCF Canada afin de m'établir au Québec."
    };
  }

  if (!base64Audio) {
    throw new Error("Nenhum áudio foi fornecido para avaliação.");
  }

  const cleanMime = cleanAudioMimeType(mimeType);

  const evalInstruction = `Você é um examinador e foneticista oficial do exame TCF Canada (Expression Orale).
O candidato gravou um áudio para a Tâche ${task}.
Enunciado da tarefa: "${prompt}"

REGRAS CRÍTICAS E OBRIGATÓRIAS (NUNCA VIOLE):
1. No campo "transcription" (ou "userTranscription"), transcreva palavra por palavra EXATAMENTE e fielmente o que o candidato pronunciou no áudio.
2. Se o áudio estiver inaudível, vazio, apenas com ruído/silêncio ou se o candidato falou em português/outro idioma, transcreva exatamente o ocorrido (ex: "[Áudio inaudível / ruído]", "[Silêncio]", "[Candidato falou em português: ...]"). NUNCA invente uma resposta modelo em francês no lugar da fala do candidato.
3. Se o candidato não falou francês inteligível, atribua a nota correspondente (ex: "02/20" ou "00/20"), classifique o NCLC de acordo, explique nos pontos fortes e correções a necessidade de produzir em francês e forneça a resposta padrão NCLC 8+ no "upgradedResponse".
4. Se o candidato falou em francês, avalie com rigor técnico nos 4 pilares:
   - nasalVowels: sons an, en, in, on
   - liaisonsAndElisions: ligações e elisões
   - rhythmAndIntonation: ritmo e acentuação tônica
   - uvularR: R uvular francês
   - pronunciationScore: nota numérica inteira de 0 a 100
   - strengths: array de 2 a 3 pontos fortes
   - corrections: array de objetos { original, corrected, explanation }
   - upgradedResponse: como um candidato NCLC 8+ responderia esta tarefa com perfeição.`;

  const schema = {
    type: "OBJECT",
    properties: {
      transcription: { type: "STRING" },
      userTranscription: { type: "STRING" },
      score20: { type: "STRING" },
      nclcLevel: { type: "STRING" },
      cefrLevel: { type: "STRING" },
      phoneticAnalysis: {
        type: "OBJECT",
        properties: {
          nasalVowels: { type: "STRING" },
          liaisonsAndElisions: { type: "STRING" },
          rhythmAndIntonation: { type: "STRING" },
          uvularR: { type: "STRING" },
          pronunciationScore: { type: "INTEGER" }
        },
        propertyOrdering: ["nasalVowels", "liaisonsAndElisions", "rhythmAndIntonation", "uvularR", "pronunciationScore"]
      },
      strengths: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      corrections: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            original: { type: "STRING" },
            corrected: { type: "STRING" },
            explanation: { type: "STRING" }
          },
          propertyOrdering: ["original", "corrected", "explanation"]
        }
      },
      upgradedResponse: { type: "STRING" }
    },
    propertyOrdering: [
      "transcription",
      "score20",
      "nclcLevel",
      "cefrLevel",
      "phoneticAnalysis",
      "strengths",
      "corrections",
      "upgradedResponse"
    ]
  };

  try {
    const res = await callGeminiApi({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Audio
              }
            },
            {
              text: `Avalie o áudio de produção oral do candidato para a Tâche ${task} do TCF Canada.`
            }
          ]
        }
      ],
      systemInstruction: { parts: [{ text: evalInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, apiKey);

    return parseStructured(res, normalizeTCFOral);
  } catch (err) {
    console.error("[evaluateTCFOralAudio] Erro detalhado:", err);
    throw err;
  }
}

/**
 * Avalia produção escrita (Expression Écrite) na régua oficial do TCF Canada (NCLC)
 */
export async function evaluateTCFProduction({ text, prompt, mode = 'ecrite', task = 1 }) {
  const apiKey = getGeminiApiKey();

  // Modo offline / sem chave
  if (!apiKey) {
    await new Promise(r => setTimeout(r, 800));
    return {
      scoreOutOf20: "13/20",
      nclcLevel: "NCLC 7",
      cefrLevel: "B2 Inicial",
      strengths: "Excelente clareza comunicativa, cumprimento adequado da extensão solicitada (Modo offline demonstrativo).",
      corrections: [
        {
          original: text.slice(0, 45) + "...",
          corrected: "Formulação mais natural com tempos verbais compostos bem acordados.",
          explanation: "Ative sua chave Gemini em Configurações (⚙️) para avaliações personalizadas em tempo real."
        }
      ],
      upgradedVersionB2: `Bonjour Maxime,\n\nJ'espère que tu te portes à merveille ! Je prends quelques minutes pour t'écrire, car je viens de m'installer à Montréal afin de suivre un perfectionnement en français.\n\nAu plaisir d'avoir de tes nouvelles,\nLucas`
    };
  }

  const schema = {
    type: "OBJECT",
    properties: {
      scoreOutOf20: { type: "STRING" },
      nclcLevel: { type: "STRING" },
      cefrLevel: { type: "STRING" },
      strengths: { type: "STRING" },
      corrections: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            original: { type: "STRING" },
            corrected: { type: "STRING" },
            explanation: { type: "STRING" }
          },
          propertyOrdering: ["original", "corrected", "explanation"]
        }
      },
      upgradedVersionB2: { type: "STRING" }
    },
    propertyOrdering: ["scoreOutOf20", "nclcLevel", "cefrLevel", "strengths", "corrections", "upgradedVersionB2"]
  };

  const evalPrompt = `Você é um corretor oficial e rigoroso do exame TCF Canada.
Modo: ${mode === 'ecrite' ? 'Expression Écrite' : 'Expression Orale'} - Tâche ${task}.
Enunciado da tarefa: "${prompt}"
Resposta do candidato: "${text}"

Avalie rigorosamente na régua NCLC e retorne estritamente o JSON:
- scoreOutOf20 (ex: "13/20")
- nclcLevel (ex: "NCLC 7" ou "NCLC 5")
- cefrLevel (ex: "B2" ou "B1")
- strengths (pontos fortes da resposta em português)
- corrections (lista de até 3 correções específicas com original, corrected e explanation em português)
- upgradedVersionB2 (como um candidato NCLC 8+ escreveria/falaria essa mesma resposta em francês natural com vocabulário rico).`;

  try {
    const res = await callGeminiApi({
      contents: [{ role: "user", parts: [{ text: evalPrompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, apiKey);

    return parseStructured(res, normalizeTCFWritten);
  } catch (err) {
    console.error("[evaluateTCFProduction] Erro detalhado:", err);
    throw err;
  }
}

/**
 * Calcula a pontuação oficial do TCF Canada (escala 330 a 699 pontos) e mapeia para o NCLC correspondente
 * segundo a tabela oficial do IRCC para Compréhension Orale (CO) e Compréhension Écrite (CE).
 *
 * @param {Array<{level: string, isCorrect: boolean}>} history Array de questões respondidas na sessão
 * @param {'co' | 'ce'} examType 'co' (Compréhension Orale) ou 'ce' (Compréhension Écrite)
 */
export function calculateTCFComprehensionScore(history = [], examType = 'co') {
  if (!history || history.length === 0) {
    return {
      points: 330,
      nclc: 'Abaixo de NCLC 4',
      cefr: 'A1',
      badgeColor: 'slate',
      expressEntryReady: false
    };
  }

  const levelWeights = {
    A1: 1.0,
    A2: 1.35,
    B1: 1.75,
    B2: 2.3,
    C1: 2.9
  };

  const levelTargetPoints = {
    A1: 335,
    A2: 365,
    B1: 425,
    B2: 495,
    C1: 585
  };

  let totalWeight = 0;
  let earnedWeight = 0;
  let weightedTargetSum = 0;

  history.forEach((item) => {
    const lvl = item.level || 'B1';
    const w = levelWeights[lvl] || 1.5;
    totalWeight += w;
    if (item.isCorrect) {
      earnedWeight += w;
      weightedTargetSum += (levelTargetPoints[lvl] || 450) * w;
    } else {
      weightedTargetSum += 330 * w;
    }
  });

  const accuracyRatio = totalWeight > 0 ? earnedWeight / totalWeight : 0;
  const avgTarget = totalWeight > 0 ? weightedTargetSum / totalWeight : 330;

  // Combina a precisão ponderada com o teto do nível praticado dentro da escala 330..699
  const rawScore = Math.round(330 + (avgTarget - 330) * 0.65 + accuracyRatio * 145);
  const points = Math.max(330, Math.min(699, rawScore));

  // Mapeamento oficial IRCC (TCF Canada)
  let nclc = 'NCLC 4';
  let cefr = 'A2';
  let badgeColor = 'amber';

  if (examType === 'co') {
    // Compréhension Orale (CO)
    if (points >= 549) { nclc = 'NCLC 10'; cefr = 'C2'; badgeColor = 'emerald'; }
    else if (points >= 523) { nclc = 'NCLC 9'; cefr = 'C1'; badgeColor = 'emerald'; }
    else if (points >= 503) { nclc = 'NCLC 8'; cefr = 'B2+'; badgeColor = 'emerald'; }
    else if (points >= 458) { nclc = 'NCLC 7'; cefr = 'B2'; badgeColor = 'emerald'; }
    else if (points >= 398) { nclc = 'NCLC 6'; cefr = 'B1+'; badgeColor = 'blue'; }
    else if (points >= 369) { nclc = 'NCLC 5'; cefr = 'B1'; badgeColor = 'blue'; }
    else if (points >= 331) { nclc = 'NCLC 4'; cefr = 'A2'; badgeColor = 'amber'; }
    else { nclc = 'NCLC < 4'; cefr = 'A1'; badgeColor = 'rose'; }
  } else {
    // Compréhension Écrite (CE)
    if (points >= 549) { nclc = 'NCLC 10'; cefr = 'C2'; badgeColor = 'emerald'; }
    else if (points >= 524) { nclc = 'NCLC 9'; cefr = 'C1'; badgeColor = 'emerald'; }
    else if (points >= 499) { nclc = 'NCLC 8'; cefr = 'B2+'; badgeColor = 'emerald'; }
    else if (points >= 453) { nclc = 'NCLC 7'; cefr = 'B2'; badgeColor = 'emerald'; }
    else if (points >= 406) { nclc = 'NCLC 6'; cefr = 'B1+'; badgeColor = 'blue'; }
    else if (points >= 375) { nclc = 'NCLC 5'; cefr = 'B1'; badgeColor = 'blue'; }
    else if (points >= 342) { nclc = 'NCLC 4'; cefr = 'A2'; badgeColor = 'amber'; }
    else { nclc = 'NCLC < 4'; cefr = 'A1'; badgeColor = 'rose'; }
  }

  return {
    points,
    nclc,
    cefr,
    badgeColor,
    accuracyPercent: Math.round(accuracyRatio * 100),
    expressEntryReady: points >= (examType === 'co' ? 458 : 453)
  };
}

/**
 * Gera questão dinâmica de Compréhension Orale (CO) do TCF Canada via IA
 */
export async function generateTCFListeningQuestion({ level = 'B2', topic = '' } = {}) {
  const apiKey = getGeminiApiKey();

  const fallbackQuestions = {
    A1: {
      level: 'A1',
      context: 'À la boulangerie à Montréal',
      audioScript: "Bonjour monsieur ! Je voudrais deux croissants au beurre et un café filtre moyen pour emporter, s'il vous plaît. Combien ça coûte ?",
      question: "Que souhaite acheter le client ?",
      options: [
        { id: 'A', text: "Un sandwich et un jus d'orange." },
        { id: 'B', text: "Deux croissants et un café." },
        { id: 'C', text: "Une baguette et du fromage." },
        { id: 'D', text: "Un gâteau au chocolat pour quatre personnes." }
      ],
      correctOption: 'B',
      explanation: "O cliente pede claramente 'deux croissants au beurre et un café filtre moyen pour emporter' (dois croissants amanteigados e um café coado médio para viagem).",
      keyVocabulary: {
        french: "Un café filtre pour emporter",
        portuguese: "Um café coado para viagem (expressão típica do Québec)",
        example: "Je vais prendre un café filtre pour emporter, s'il vous plaît."
      }
    },
    A2: {
      level: 'A2',
      context: 'Annonce dans le métro de Montréal (STM)',
      audioScript: "Attention à tous les passagers : en raison d'un problème technique à la station Berri-UQAM, le service sur la ligne verte est interrompu entre les stations McGill et Frontenac jusqu'à quatorze heures. Des autobus de navette sont à votre disposition à la sortie principale.",
      question: "Quelle solution est proposée aux voyageurs affectés par l'interruption ?",
      options: [
        { id: 'A', text: "Attendre gratuitement dans le train jusqu'à quinze heures." },
        { id: 'B', text: "Prendre un taxi remboursé par la mairie." },
        { id: 'C', text: "Utiliser les autobus de remplacement à la sortie principale." },
        { id: 'D', text: "Marcher jusqu'à la prochaine gare ferroviaire." }
      ],
      correctOption: 'C',
      explanation: "O anúncio informa que 'Des autobus de navette sont à votre disposition à la sortie principale' (ônibus circulares de substituição estão disponíveis na saída principal).",
      keyVocabulary: {
        french: "En raison d'un problème technique",
        portuguese: "Devido a / em razão de um problema técnico",
        example: "Le vol est retardé en raison d'une tempête de neige."
      }
    },
    B1: {
      level: 'B1',
      context: 'Conversation entre deux collègues à Québec',
      audioScript: "— Salut Amélie, tu viens toujours au souper d'équipe vendredi soir ?\n— Honnêtement Marc, j'aimerais bien, mais la gardienne de mes enfants vient d'annuler à la dernière minute. À moins que mon conjoint ne finisse son quart de travail plus tôt, je vais devoir rester à la maison.",
      question: "Pourquoi Amélie hésite-t-elle à participer au souper de vendredi ?",
      options: [
        { id: 'A', text: "Elle doit travailler tard au bureau vendredi soir." },
        { id: 'B', text: "Elle n'a personne pour garder ses enfants pour le moment." },
        { id: 'C', text: "Elle préfère souper dans un autre restaurant avec son conjoint." },
        { id: 'D', text: "Elle est tombée malade après son quart de travail." }
      ],
      correctOption: 'B',
      explanation: "Amélie explica que a babá ('la gardienne') cancelou de última hora e, a menos que o marido saia mais cedo do turno ('quart de travail'), ela terá que ficar em casa.",
      keyVocabulary: {
        french: "Un quart de travail / À moins que (+ subjonctif)",
        portuguese: "Um turno de trabalho / A menos que",
        example: "À moins qu'il ne finisse son quart de travail plus tôt, je resterai ici."
      }
    },
    B2: {
      level: 'B2',
      context: 'Chronique économique sur Radio-Canada',
      audioScript: "Si le télétravail hybride s'est imposé durablement dans les entreprises technologiques de la région métropolitaine de Montréal, plusieurs chambres de commerce soulignent néanmoins un défi de taille : la vitalité économique des commerces du centre-ville dépend étroitement de la fréquentation quotidienne des travailleurs de bureau. Dès lors, les municipalités cherchent à réinventer ces espaces en privilégiant des projets mixtes alliant logements et loisirs.",
      question: "Quel constat principal est dressé dans cette chronique ?",
      options: [
        { id: 'A', text: "Les entreprises technologiques interdisent désormais le télétravail à Montréal." },
        { id: 'B', text: "La baisse de présence des employés au bureau oblige à repenser l'économie du centre-ville." },
        { id: 'C', text: "Les commerces du centre-ville ont doublé leurs revenus grâce au travail hybride." },
        { id: 'D', text: "Les municipalités souhaitent transformer tous les logements en bureaux." }
      ],
      correctOption: 'B',
      explanation: "A crônica destaca que a presença reduzida dos trabalhadores no centro afeta o comércio local, levando as prefeituras a reinventar esses espaços com projetos mistos de moradia e lazer.",
      keyVocabulary: {
        french: "Un défi de taille / Dès lors",
        portuguese: "Um grande desafio / A partir de então, portanto",
        example: "L'intégration professionnelle représente un défi de taille pour les nouveaux arrivants."
      }
    },
    C1: {
      level: 'C1',
      context: 'Entrevue universitaire sur la politique linguistique et culturelle',
      audioScript: "Il serait réducteur d'envisager l'essor de la francophonie nord-américaine sous le seul prisme de la préservation patrimoniale. Ce qui se joue aujourd'hui au sein des pôles d'innovation québécois et franco-ontariens relève davantage d'une dynamique d'hybridation créative, où la langue française s'affirme comme un vecteur de recherche scientifique de pointe tout en négociant constamment sa place face à l'hégémonie anglophone.",
      question: "Quelle est la thèse défendue par l'intervenant ?",
      options: [
        { id: 'A', text: "Le français en Amérique du Nord survit uniquement grâce aux musées historiques." },
        { id: 'B', text: "La recherche scientifique au Québec s'effectue désormais exclusivement en anglais." },
        { id: 'C', text: "La francophonie nord-américaine est un espace vivant d'innovation scientifique et d'adaptation." },
        { id: 'D', text: "Les pôles franco-ontariens ont renoncé à toute forme d'innovation technologique." }
      ],
      correctOption: 'C',
      explanation: "O especialista argumenta que seria redutor ver a francofonia apenas como preservação do passado; ela atua como um motor dinâmico de pesquisa científica de ponta e criatividade.",
      keyVocabulary: {
        french: "Sous le seul prisme de / Relever de",
        portuguese: "Sob o único prisma de / Dizer respeito a, decorrer de",
        example: "Il serait réducteur d'analyser ce phénomène sous le seul prisme économique."
      }
    }
  };

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 700));
    return fallbackQuestions[level] || fallbackQuestions.B2;
  }

  const prompt = `Você é um elaborador oficial de provas do TCF Canada (Compréhension Orale).
Crie uma questão inédita de compreensão oral de nível CEFR "${level}" ambientada no cotidiano do Canadá francófono (Québec, Montréal, Ottawa, Nouveau-Brunswick) ou da França${topic ? ` sobre o tema: ${topic}` : ''}.

Requisitos por nível:
- A1/A2: Situação prática do dia a dia (comércio, transporte, consulta médica, aviso público curto).
- B1/B2: Diálogo profissional, entrevista na Radio-Canada, questão de imigração, trabalho ou serviços públicos.
- C1: Crônica analítica, debate acadêmico ou reflexão socioeconômica com vocabulário sofisticado.

Retorne estritamente um JSON com:
- level: "${level}"
- context: Breve descrição da situação (ex: "Dialogue au centre de services de l'emploi à Québec")
- audioScript: O texto falado em francês autêntico (de 35 a 85 palavras) que será reproduzido via síntese de voz (não inclua os rótulos 'Homme:' ou 'Femme:', escreva como fala contínua ou diálogo fluido natural para leitura em voz alta).
- question: A pergunta oficial em francês.
- options: Array com exatamente 4 objetos { id: "A"|"B"|"C"|"D", text: "opção em francês" }.
- correctOption: "A", "B", "C" ou "D".
- explanation: Explicação pedagógica clara em português detalhando por que a resposta está certa e traduzindo termos importantes.
- keyVocabulary: Objeto { french, portuguese, example } com 1 expressão útil do áudio para salvar nos flashcards SM-2.`;

  const schema = {
    type: "OBJECT",
    properties: {
      level: { type: "STRING" },
      context: { type: "STRING" },
      audioScript: { type: "STRING" },
      question: { type: "STRING" },
      options: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            text: { type: "STRING" }
          },
          propertyOrdering: ["id", "text"]
        }
      },
      correctOption: { type: "STRING" },
      explanation: { type: "STRING" },
      keyVocabulary: {
        type: "OBJECT",
        properties: {
          french: { type: "STRING" },
          portuguese: { type: "STRING" },
          example: { type: "STRING" }
        },
        propertyOrdering: ["french", "portuguese", "example"]
      }
    },
    propertyOrdering: [
      "level",
      "context",
      "audioScript",
      "question",
      "options",
      "correctOption",
      "explanation",
      "keyVocabulary"
    ]
  };

  try {
    const res = await callGeminiApi({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, apiKey);

    return parseStructured(res, normalizeListeningQuestion, level);
  } catch (err) {
    console.error("[generateTCFListeningQuestion] Erro detalhado:", err);
    throw err;
  }
}

/**
 * Gera questão dinâmica de Compréhension Écrite (CE) do TCF Canada via IA
 */
export async function generateTCFReadingQuestion({ level = 'B2', category = '' } = {}) {
  const apiKey = getGeminiApiKey();

  const fallbackReading = {
    A1: {
      level: 'A1',
      documentType: 'Avis municipal • Bibliothèque de Montréal',
      title: 'Nouveaux horaires d’ouverture estivale',
      passage: "Chers usagers,\n\nVeuillez noter qu'à partir du 1er juillet, la bibliothèque municipale du Plateau-Mont-Royal sera ouverte du lundi au vendredi de 9 h à 20 h, et le samedi de 10 h à 17 h. La bibliothèque sera fermée le dimanche durant tout l'été. Le retour des livres reste possible 24h/24 grâce à la chute à livres extérieure.",
      question: "Quel jour la bibliothèque est-elle complètement fermée en été ?",
      options: [
        { id: 'A', text: "Le lundi matin." },
        { id: 'B', text: "Le vendredi soir." },
        { id: 'C', text: "Le samedi après-midi." },
        { id: 'D', text: "Le dimanche toute la journée." }
      ],
      correctOption: 'D',
      explanation: "O aviso afirma explicitamente: 'La bibliothèque sera fermée le dimanche durant tout l'été' (A biblioteca estará fechada aos domingos durante todo o verão).",
      keyVocabulary: {
        french: "Veuillez noter que / À partir de",
        portuguese: "Por favor, observe que / A partir de",
        example: "Veuillez noter que nos bureaux seront fermés lundi prochain."
      }
    },
    A2: {
      level: 'A2',
      documentType: 'Courriel professionnel • Ressources Humaines (Québec)',
      title: 'Inscription à la formation de francisation en entreprise',
      passage: "Bonjour à toute l'équipe,\n\nNotre entreprise offre désormais des ateliers de perfectionnement en français des affaires tous les mardis et jeudis de 12 h à 13 h dans la salle de conférence B. Les cours sont entièrement gratuits et le repas du midi est fourni par l'employeur. Pour participer, vous devez envoyer un courriel à Mme Tremblay avant ce vendredi midi.",
      question: "Que doivent faire les employés intéressés par cette formation ?",
      options: [
        { id: 'A', text: "Payer des frais d'inscription au service comptable." },
        { id: 'B', text: "Confirmer leur présence par courriel avant vendredi à 12 h." },
        { id: 'C', text: "Apporter leur propre repas dans la salle de conférence." },
        { id: 'D', text: "Se présenter directement le jeudi soir après le travail." }
      ],
      correctOption: 'B',
      explanation: "O último período indica claramente: 'Pour participer, vous devez envoyer un courriel à Mme Tremblay avant ce vendredi midi'.",
      keyVocabulary: {
        french: "Le repas du midi / Envoyer un courriel",
        portuguese: "O almoço / Enviar um e-mail (termo oficial no Québec)",
        example: "Je vous ai envoyé un courriel avec les pièces jointes."
      }
    },
    B1: {
      level: 'B1',
      documentType: "Offre d'emploi • TechnoMontréal",
      title: 'Analyste en assurance qualité logicielle (Mode hybride)',
      passage: "Située au cœur du quartier de l'innovation à Montréal, notre société recherche un(e) analyste motivé(e) pour joindre son équipe agile. Le candidat retenu devra posséder au moins deux ans d'expérience en tests automatisés ainsi qu'une maîtrise fonctionnelle du français à l'oral et à l'écrit. Outre une assurance collective complète dès le premier jour, nous offrons quatre semaines de vacances annuelles et une allocation pour l'équipement de bureau à domicile.",
      question: "Quel avantage est offert dès l'embauche selon cette annonce ?",
      options: [
        { id: 'A', text: "Une voiture de fonction fournie par l'entreprise." },
        { id: 'B', text: "Une couverture d'assurance santé et collective immédiate." },
        { id: 'C', text: "Une dispense complète d'expérience professionnelle préalable." },
        { id: 'D', text: "Un travail réalisé exclusivement à l'étranger." }
      ],
      correctOption: 'B',
      explanation: "O anúncio menciona 'Outre une assurance collective complète dès le premier jour' (além de um seguro coletivo completo desde o primeiro dia).",
      keyVocabulary: {
        french: "Le candidat retenu / Outre (+ nom)",
        portuguese: "O candidato aprovado/selecionado / Além de",
        example: "Le candidat retenu entrera en fonction au début du mois prochain."
      }
    },
    B2: {
      level: 'B2',
      documentType: 'Article de presse • Mobilité et régionalisation au Canada',
      title: 'L’attractivité croissante des villes moyennes québécoises',
      passage: "Longtemps concentrée dans la métropole montréalaise, l'immigration qualifiée au Québec connaît depuis quelques années un redéploiement notable vers des pôles régionaux tels que Sherbrooke, Trois-Rivières ou Saguenay. Attirés par un coût de la vie plus abordable, un accès facilité à la propriété et une pénurie de main-d'œuvre qui accélère l'embauche, les nouveaux arrivants y trouvent une qualité de vie appréciable. Toutefois, les organismes communautaires rappellent que la rétention à long terme de ces familles demeure tributaire du développement des transports collectifs et de la reconnaissance rapide des diplômes étrangers.",
      question: "Selon l'article, quelle condition est essentielle pour que les nouveaux arrivants restent durablement en région ?",
      options: [
        { id: 'A', text: "La baisse immédiate des salaires dans les grandes entreprises de Montréal." },
        { id: 'B', text: "L'amélioration de la mobilité urbaine et la validation des qualifications acquises à l'étranger." },
        { id: 'C', text: "La suppression des organismes communautaires d'accueil." },
        { id: 'D', text: "L'obligation légale d'acheter une maison dès la première année." }
      ],
      correctOption: 'B',
      explanation: "O texto ressalta no final que a retenção a longo prazo depende ('demeure tributaire') do desenvolvimento do transporte público e do reconhecimento rápido de diplomas estrangeiros.",
      keyVocabulary: {
        french: "Demeurer tributaire de / Une pénurie de main-d'œuvre",
        portuguese: "Permanecer dependente de / Uma escassez de mão de obra",
        example: "La croissance économique demeure tributaire de l'attraction de talents qualifiés."
      }
    },
    C1: {
      level: 'C1',
      documentType: 'Essai critique • Éthique et intelligence artificielle',
      title: 'La gouvernance algorithmique à l’épreuve de la transparence démocratique',
      passage: "À mesure que les administrations publiques intègrent des systèmes prédictifs pour optimiser l'allocation de leurs ressources, une tension fondamentale émerge entre l'impératif d'efficience gestionnaire et l'exigence d'intelligibilité citoyenne. Loin d'être de simples outils neutres, les architectures algorithmiques incorporent implicitement les biais historiques des données qui les alimentent. Par conséquent, plusieurs juristes canadiens plaident pour l'instauration d'un droit opposable à l'explication, assorti d'audits indépendants systématiques, afin d'éviter que la technocratie numérique ne vide de sa substance le principe même de redevabilité publique.",
      question: "Quelle préoccupation majeure l'auteur exprime-t-il dans cet extrait ?",
      options: [
        { id: 'A', text: "Le retard technologique des tribunaux canadiens face aux entreprises privées." },
        { id: 'B', text: "Le risque que l'opacité des algorithmes compromette la responsabilité démocratique des institutions." },
        { id: 'C', text: "L'interdiction totale d'utiliser des ordinateurs dans les services publics." },
        { id: 'D', text: "Le coût financier excessif des audits comptables traditionnels." }
      ],
      correctOption: 'B',
      explanation: "O autor alerta que a opacidade e os vieses dos algoritmos podem esvaziar o princípio de prestação de contas ('redevabilité publique'), defendendo auditorias independentes e direito à explicação.",
      keyVocabulary: {
        french: "Vider de sa substance / La redevabilité publique",
        portuguese: "Esvaziar de seu sentido essencial / A responsabilidade e prestação de contas pública",
        example: "Cette réforme risque de vider de sa substance la loi initiale."
      }
    }
  };

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 700));
    return fallbackReading[level] || fallbackReading.B2;
  }

  const prompt = `Você é um elaborador oficial de provas do TCF Canada (Compréhension Écrite).
Crie um texto de leitura autêntico e uma questão de múltipla escolha de nível CEFR "${level}" focado no contexto canadense (Québec, imigração, mercado de trabalho no Canadá, avisos oficiais, imprensa francófona)${category ? ` na categoria: ${category}` : ''}.

Requisitos por nível:
- A1/A2: Anúncio curto, aviso municipal, e-mail cotidiano ou cartaz informativo (60 a 100 palavras).
- B1/B2: Oferta de emprego no Québec, e-mail corporativo, artigo de jornal sobre imigração/sociedade no Canadá (110 a 170 palavras).
- C1: Editorial analítico, artigo científico/jurídico ou crítica socioeconômica densa (150 a 200 palavras).

Retorne estritamente um JSON com:
- level: "${level}"
- documentType: Tipo do documento (ex: "Offre d'emploi au Québec", "Article de presse • Le Devoir")
- title: Título do texto em francês
- passage: O texto completo em francês (bem formatado)
- question: A pergunta de interpretação em francês
- options: Array com 4 objetos { id: "A"|"B"|"C"|"D", text: "opção em francês" }
- correctOption: "A", "B", "C" ou "D"
- explanation: Explicação detalhada em português justificando a resposta correta com base no texto e explicando as pegadinhas.
- keyVocabulary: Objeto { french, portuguese, example } com 1 expressão de alto valor do texto para salvar nos flashcards SM-2.`;

  const schema = {
    type: "OBJECT",
    properties: {
      level: { type: "STRING" },
      documentType: { type: "STRING" },
      title: { type: "STRING" },
      passage: { type: "STRING" },
      question: { type: "STRING" },
      options: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            id: { type: "STRING" },
            text: { type: "STRING" }
          },
          propertyOrdering: ["id", "text"]
        }
      },
      correctOption: { type: "STRING" },
      explanation: { type: "STRING" },
      keyVocabulary: {
        type: "OBJECT",
        properties: {
          french: { type: "STRING" },
          portuguese: { type: "STRING" },
          example: { type: "STRING" }
        },
        propertyOrdering: ["french", "portuguese", "example"]
      }
    },
    propertyOrdering: [
      "level",
      "documentType",
      "title",
      "passage",
      "question",
      "options",
      "correctOption",
      "explanation",
      "keyVocabulary"
    ]
  };

  try {
    const res = await callGeminiApi({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, apiKey);

    return parseStructured(res, normalizeReadingQuestion, level);
  } catch (err) {
    console.error("[generateTCFReadingQuestion] Erro detalhado:", err);
    throw err;
  }
}

/**
 * Avaliação de Pronúncia Micro-Cirúrgica no Shadowing Studio (Multimodal Audio)
 * Compara o áudio gravado pelo aluno especificamente com a frase-alvo (targetSentence).
 */
export async function evaluateShadowingAudio({
  base64Audio,
  mimeType = 'audio/webm',
  targetSentence,
  focusPoints = []
}) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 900));
    return {
      pronunciationScore: 84,
      spokenTranscription: `[Modo Offline • Sem Chave Gemini] "${targetSentence}"`,
      surgicalFeedback:
        "No modo offline demonstrativo: excelente tentativa de ritmo! Para análise fonética real do seu áudio via Gemini (detectando exatamente quais liaisons, vogais nasais ou 'R' uvulares você acertou ou errou nesta frase), insira sua chave em Configurações (⚙️) no topo.",
      specificCorrections: focusPoints.length > 0
        ? focusPoints
        : [
            "Atenção às consoantes finais mudas e às ligações obrigatórias (liaisons) desta frase."
          ],
      rhythmTip: "Mantenha a cadência contínua como uma única palavra fonética, apoiando a força na última sílaba."
    };
  }

  if (!base64Audio) {
    throw new Error("Nenhum áudio gravado foi encontrado para avaliar o Shadowing.");
  }

  const cleanMime = cleanAudioMimeType(mimeType);

  const systemInstruction = `Você é um fonoaudiólogo e professor especialista em fonética francesa (sotaque canadense/internacional) treinando um aluno brasileiro no método de Shadowing.
Frase-alvo que o aluno tentou pronunciar: "${targetSentence}"
Pontos fonéticos de atenção nesta frase: ${focusPoints.join(' | ')}

REGRAS CRÍTICAS E OBRIGATÓRIAS:
1. Ouça atentamente o áudio em anexo e transcreva no campo "spokenTranscription" EXATAMENTE o que o aluno disse (se estiver em silêncio, com ruído ou em português, relate fielmente ex: "[Silêncio / Ruído]" e atribua nota baixa coerente). NUNCA invente que o aluno leu a frase se o áudio estiver vazio ou diferente.
2. Atribua um "pronunciationScore" inteiro de 0 a 100 medindo a fidelidade fonética, ritmo e clareza em relação à frase-alvo.
3. No campo "surgicalFeedback", escreva um feedback cirúrgico, direto e gentil em português focando APENAS nos desvios fonéticos reais cometidos pelo aluno nesta frase específica (ex: "Você esqueceu a liaison entre 'les' e 'amis'", "O 't' final de 'appartement' soou audível, mas deve ser mudo", "A vogal 'u' em 'tu' soou como 'ou'"). Se a pronúncia foi impecável, elogie os pontos específicos que ele acertou.
4. No campo "specificCorrections", liste de 2 a 3 ajustes práticos e pontuais sobre palavras exatas da frase-alvo.
5. No campo "rhythmTip", avalie em 1 frase curta em português se o ritmo/cadência dele ficou próximo do nativo ou se houve pausas bruscas.`;

  const schema = {
    type: "OBJECT",
    properties: {
      pronunciationScore: { type: "INTEGER" },
      spokenTranscription: { type: "STRING" },
      surgicalFeedback: { type: "STRING" },
      specificCorrections: {
        type: "ARRAY",
        items: { type: "STRING" }
      },
      rhythmTip: { type: "STRING" }
    },
    propertyOrdering: [
      "pronunciationScore",
      "spokenTranscription",
      "surgicalFeedback",
      "specificCorrections",
      "rhythmTip"
    ]
  };

  try {
    const res = await callGeminiApi({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: cleanMime,
                data: base64Audio
              }
            },
            {
              text: `Avalie a pronúncia deste áudio de Shadowing comparando estritamente com a frase-alvo: "${targetSentence}".`
            }
          ]
        }
      ],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }, apiKey);

    return parseStructured(res, normalizeShadowing);
  } catch (err) {
    console.error("[evaluateShadowingAudio] Erro detalhado:", err);
    throw err;
  }
}
