export type ProjectTimeline = "immediat" | "moins_3_mois" | "moins_6_mois" | "plus_6_mois" | "inconnu";

export type PriorityScoreInput = {
  interestLevel: number | null;
  estimatedBudget: number | null;
  projectTimeline: ProjectTimeline | string | null;
  capacityFit: number | null;
  recurrencePotential: number | null;
  needMaturity: number | null;
};

const timelineScores: Record<string, number> = {
  immediat: 100,
  moins_3_mois: 80,
  moins_6_mois: 55,
  plus_6_mois: 30,
  inconnu: 40
};

export function calculatePriorityScore(input: PriorityScoreInput) {
  const interestScore = normalizeScale(input.interestLevel, 5);
  const budgetScore = normalizeBudget(input.estimatedBudget);
  const timelineScore = timelineScores[input.projectTimeline ?? "inconnu"] ?? 40;
  const capacityScore = normalizeScale(input.capacityFit, 5);
  const recurrenceScore = normalizeScale(input.recurrencePotential, 5);
  const maturityScore = normalizeScale(input.needMaturity, 5);

  const score =
    interestScore * 0.25 +
    budgetScore * 0.2 +
    timelineScore * 0.15 +
    capacityScore * 0.15 +
    recurrenceScore * 0.1 +
    maturityScore * 0.15;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function getPriorityTone(score: number) {
  if (score >= 75) {
    return "success";
  }

  if (score >= 50) {
    return "warning";
  }

  return "neutral";
}

function normalizeScale(value: number | null, max: number) {
  if (!value) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function normalizeBudget(value: number | null) {
  if (!value) {
    return 0;
  }

  if (value >= 50000) {
    return 100;
  }

  if (value >= 25000) {
    return 80;
  }

  if (value >= 10000) {
    return 55;
  }

  if (value >= 5000) {
    return 35;
  }

  return 15;
}
