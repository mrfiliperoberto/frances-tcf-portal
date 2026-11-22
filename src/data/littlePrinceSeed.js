import { LE_PETIT_PRINCE_SENTENCES } from './lePetitPrince';

/**
 * Seed oficial do Capítulo 1 de "Le Petit Prince" (Antoine de Saint-Exupéry)
 * para a store `guidedReading` do IndexedDB.
 *
 * Cada item possui `{ id, french, translation }`.
 */
export const LITTLE_PRINCE_SEED = [
  {
    id: 1,
    book_title: 'Le Petit Prince',
    author: 'Antoine de Saint-Exupéry',
    chapter: 'Chapitre I — Le Dessin du Boa',
    is_completed: false,
    stanzas: LE_PETIT_PRINCE_SENTENCES.map((item) => ({
      id: item.id,
      french: item.french,
      translation: item.translation,
      text_fr: item.french,
      text_pt: item.translation
    }))
  }
];

export default LITTLE_PRINCE_SEED;
