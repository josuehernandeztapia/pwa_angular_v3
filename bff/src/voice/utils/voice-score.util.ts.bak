export type Weights = { w1:number; w2:number; w3:number; w4:number; w5:number };

const clamp01 = (x:number) => Math.max(0, Math.min(1, x));

const std = (arr:number[])=>{
  const n = arr.length || 1;
  const m = arr.reduce((a,b)=>a+b,0)/n;
  const v = arr.reduce((s,x)=> s + (x - m) * (x - m), 0) / n;
  return Math.sqrt(v);
};

export function normalizeLatency(latencySec:number, answerDurationSec:number): number {
  const ratio = answerDurationSec>0 ? latencySec / (answerDurationSec + latencySec) : 1;
  return clamp01(ratio * 2);
}

export function pitchVariability(pitchHz:number[]): number {
  if (!pitchHz || pitchHz.length < 3) return 0.5;
  const filtered = pitchHz.filter(x => x > 0);
  if (filtered.length < 3) return 0.5;
  const s = std(filtered);
  return clamp01(s / 50);
}

export function energyStability(energy:number[]): number {
  if (!energy || energy.length < 3) return 0.5;
  const m = energy.reduce((a,b)=>a+b,0)/energy.length || 1e-6;
  const s = std(energy);
  const cv = s / m;
  return clamp01(1 - (cv / 0.6));
}

export function disfluencyRate(words:string[], hesitationLex:string[]): number {
  if (!words || words.length === 0) return 0;
  const tokens = words.map(w=>w.toLowerCase());
  const hits = tokens.filter(t => hesitationLex.includes(t)).length;
  const rate = hits / Math.max(1, (tokens.length / 100));
  return clamp01(rate / 10);
}

export function honestyLexicon(words:string[], honestyTerms:string[]): number {
  if (!words || words.length === 0) return 0.3;
  const tokens = new Set(words.map(w=>w.toLowerCase()));
  const hits = honestyTerms.filter(t => tokens.has(t)).length;
  return clamp01(hits / 3);
}

export function computeVoiceScore(
  payload: {
    latencySec: number;
    answerDurationSec: number;
    pitchSeriesHz: number[];
    energySeries: number[];
    words: string[];
  },
  weights: Weights = { w1:0.25, w2:0.20, w3:0.20, w4:0.15, w5:0.20 },
  lexicons = {
    hesitation: ['pues','mmm','no','sé','tal','vez','eh','em'],
    honesty: ['hijo','socio','ahorro','tengo','respaldo','esposa','familia','apoyo']
  }
){
  const L = normalizeLatency(payload.latencySec, payload.answerDurationSec);
  const P = pitchVariability(payload.pitchSeriesHz);
  const D = disfluencyRate(payload.words, lexicons.hesitation);
  const E = energyStability(payload.energySeries);
  const H = honestyLexicon(payload.words, lexicons.honesty);

  const voiceScore =
    weights.w1 * (1 - L) +
    weights.w2 * (1 - P) +
    weights.w3 * (1 - D) +
    weights.w4 * E +
    weights.w5 * H;

  const flags: string[] = [];
  if (L > 0.7) flags.push('highLatency');
  if (P > 0.7) flags.push('unstablePitch');
  if (D > 0.6) flags.push('highDisfluency');
  if (E < 0.3) flags.push('lowEnergyStability');
  if (H < 0.3) flags.push('lowHonestyLexicon');

  let decision: 'GO'|'REVIEW'|'NO-GO';
  if (voiceScore >= 0.75 && flags.length <= 1) decision = 'GO';
  else if (voiceScore >= 0.55 && flags.length <= 2) decision = 'REVIEW';
  else decision = 'NO-GO';

  return {
    latencyIndex: L,
    pitchVar: P,
    disfluencyRate: D,
    energyStability: E,
    honestyLexicon: H,
    voiceScore: clamp01(voiceScore),
    flags,
    decision,
  };
}

