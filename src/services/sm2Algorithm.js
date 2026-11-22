/**
 * Motor de Revisão Estrita (Ciclo 15, 30 e 45 dias) + Utilitários de Data (YYYY-MM-DD).
 *
 * Cada item estudado recebe:
 * - studiedAt: string no formato YYYY-MM-DD
 * - reviewDates: [DataAtual + 15 dias, DataAtual + 30 dias, DataAtual + 45 dias] (formato YYYY-MM-DD)
 * - isMastered: boolean (true quando a revisão do dia 45 é concluída)
 */

export const SM2_DEFAULTS = {
  repetition: 0,
  interval: 15,
  easeFactor: 2.5,
  minEaseFactor: 1.3
};

/**
 * Formata um objeto Date ou string para YYYY-MM-DD no fuso horário local.
 */
export function formatDateYYYYMMDD(dateInput = new Date()) {
  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Adiciona N dias a uma data base e retorna no formato YYYY-MM-DD.
 */
export function addDaysYYYYMMDD(baseDate = new Date(), daysToAdd = 15) {
  const d = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  d.setDate(d.getDate() + Number(daysToAdd));
  return formatDateYYYYMMDD(d);
}

/**
 * Gera exatamente as 3 datas estritas de revisão:
 * [DataAtual + 15 dias, DataAtual + 30 dias, DataAtual + 45 dias] no formato YYYY-MM-DD.
 */
export function generateReviewDates15_30_45(baseDate = new Date()) {
  return [
    addDaysYYYYMMDD(baseDate, 15),
    addDaysYYYYMMDD(baseDate, 30),
    addDaysYYYYMMDD(baseDate, 45)
  ];
}

/**
 * Cria o payload inicial do ciclo 15-30-45 ao marcar uma palavra como estudada.
 */
export function createStrictReviewSchedule(baseDate = new Date()) {
  const studiedAt = formatDateYYYYMMDD(baseDate);
  const reviewDates = generateReviewDates15_30_45(baseDate);

  return {
    studiedAt,
    reviewDates,
    isMastered: false
  };
}

/**
 * Mantido por compatibilidade com componentes legados do Deck:
 * avança pelos marcos estritos 15 -> 30 -> 45 dias e marca isMastered no marco de 45 dias.
 */
export function calculateSM2(card = {}, quality = 4) {
  const currentRepetition = Number(card.repetition) || 0;
  const now = new Date();
  const studiedAt = card.studiedAt || formatDateYYYYMMDD(now);
  const reviewDates =
    Array.isArray(card.reviewDates) && card.reviewDates.length === 3
      ? card.reviewDates
      : generateReviewDates15_30_45(now);

  if (quality < 3) {
    return {
      repetition: 0,
      interval: 15,
      easeFactor: 2.5,
      studiedAt: formatDateYYYYMMDD(now),
      reviewDates: generateReviewDates15_30_45(now),
      isMastered: false,
      nextReviewDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  const nextRepetition = currentRepetition + 1;
  const intervals = [15, 30, 45];
  const nextInterval = intervals[Math.min(nextRepetition - 1, intervals.length - 1)] || 45;
  const isMastered = nextRepetition >= 3;
  const nextDate = new Date(now.getTime() + nextInterval * 24 * 60 * 60 * 1000);

  return {
    repetition: nextRepetition,
    interval: nextInterval,
    easeFactor: 2.5,
    studiedAt,
    reviewDates,
    isMastered,
    nextReviewDate: nextDate.toISOString()
  };
}

export function formatIntervalPreview(days) {
  if (days <= 0) return '15d';
  return `${days}d`;
}

export function previewInterval(card = {}, quality = 4) {
  if (quality < 3) return '15d';
  const rep = Number(card.repetition) || 0;
  if (rep === 0) return '15d';
  if (rep === 1) return '30d';
  return '45d (Dominado)';
}

/**
 * Verifica se um cartão/palavra deve ser revisado hoje (reviewDates inclui hoje e !isMastered).
 */
export function isCardDue(card, todayStr = formatDateYYYYMMDD(new Date())) {
  if (!card || card.isMastered) return false;
  if (Array.isArray(card.reviewDates) && card.reviewDates.length > 0) {
    return card.reviewDates.includes(todayStr);
  }
  if (!card.nextReviewDate) return true;
  return new Date(card.nextReviewDate) <= new Date();
}
