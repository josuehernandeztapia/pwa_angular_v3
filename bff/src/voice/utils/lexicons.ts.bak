export type Plaza = 'general' | 'edomex' | 'aguascalientes';

export const LEXICONS: Record<Plaza, {
  evasive_strong: string[];
  admission_partial: string[];
  honesty_markers: string[];
}> = {
  general: {
    evasive_strong: [
      'eso no existe', 'nunca pago', 'jamás he pagado', 'no se de que habla', 'no doy nada'
    ],
    admission_partial: [
      'pago poquito', 'a veces pago', 'pago algo', 'de vez en cuando', 'cuando se puede'
    ],
    honesty_markers: [
      'hijo', 'familia', 'esposa', 'hermano', 'apoyo', 'aval', 'compañero'
    ],
  },
  edomex: {
    evasive_strong: [
      'no pago nada', 'eso no pasa', 'no conozco eso', 'aquí no hay nada de eso'
    ],
    admission_partial: [
      'pago poquito', 'a veces pago', 'cuando toca', 'cuando se puede'
    ],
    honesty_markers: [
      'mi hijo', 'esposa', 'familia', 'aval', 'compa', 'socio'
    ],
  },
  aguascalientes: {
    evasive_strong: [
      'no me meto en esas cosas', 'no tengo idea', 'eso no aplica'
    ],
    admission_partial: [
      'pues pago poco', 'a veces sí', 'casi nada'
    ],
    honesty_markers: [
      'familia', 'compañero', 'apoyo'
    ],
  }
};

export function analyzeLexicon(words: string[] = [], plaza: Plaza = 'general') {
  const text = (words || []).join(' ').toLowerCase();
  const packs = LEXICONS[plaza] || LEXICONS.general;

  const has = (arr: string[]) => arr.some(t => text.includes(t.toLowerCase()));

  const hits = {
    evasive_strong: has(packs.evasive_strong),
    admission_partial: has(packs.admission_partial),
    honesty_markers: has(packs.honesty_markers),
  };

  const reasons: string[] = [];
  if (hits.evasive_strong) reasons.push('evasive_language');
  if (hits.admission_partial) reasons.push('admission_relief_applied');
  if (hits.honesty_markers) reasons.push('honesty_markers_present');

  return { hits, reasons };
}

