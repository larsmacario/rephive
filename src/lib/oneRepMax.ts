/**
 * One Rep Max (1RM) calculation utilities for Track Your Workout.
 * 
 * Provides formulas: Epley, Brzycki, Lander, Lombardi, and their average.
 */

export interface OneRepMaxEstimates {
  epley: number;
  brzycki: number;
  lander: number;
  lombardi: number;
  average: number;
}

/**
 * Calculates estimated One Rep Max using various formulas.
 */
export function calculateOneRepMax(weight: number, reps: number): OneRepMaxEstimates {
  if (weight <= 0 || reps <= 0) {
    return { epley: 0, brzycki: 0, lander: 0, lombardi: 0, average: 0 };
  }

  if (reps === 1) {
    return {
      epley: weight,
      brzycki: weight,
      lander: weight,
      lombardi: weight,
      average: weight,
    };
  }

  // Epley: w * (1 + r / 30)
  const epley = weight * (1 + reps / 30);

  // Brzycki: w / (1.0278 - 0.0278 * r)
  // Note: Only valid for reps <= 36. For 37+, denominator is negative. Practically, it's used for reps <= 10.
  const brzycki = reps < 37 ? weight / (1.0278 - 0.0278 * reps) : epley;

  // Lander: (100 * w) / (101.3 - 2.67123 * r)
  const lander = reps < 38 ? (100 * weight) / (101.3 - 2.67123 * reps) : epley;

  // Lombardi: w * r^0.1
  const lombardi = weight * Math.pow(reps, 0.1);

  // Calculate average of the valid estimates
  const average = (epley + brzycki + lander + lombardi) / 4;

  return {
    epley: Math.round(epley * 10) / 10,
    brzycki: Math.round(brzycki * 10) / 10,
    lander: Math.round(lander * 10) / 10,
    lombardi: Math.round(lombardi * 10) / 10,
    average: Math.round(average * 10) / 10,
  };
}

export interface PercentageRow {
  percentage: number;
  weight: number;
  reps: number;
}

/**
 * Generates percentage breakdown table for an estimated 1RM.
 * Standard repetition conversion estimates:
 * 100% = 1 rep
 * 95% = 2 reps
 * 93% = 3 reps
 * 90% = 4 reps
 * 87% = 5 reps
 * 85% = 6 reps
 * 83% = 7 reps
 * 80% = 8 reps
 * 77% = 9 reps
 * 75% = 10 reps
 * 70% = 12 reps
 * 65% = 15 reps
 * 60% = 20 reps
 * 50% = 30 reps
 */
export function getPercentageBreakdown(oneRepMax: number): PercentageRow[] {
  const map: { percentage: number; reps: number }[] = [
    { percentage: 100, reps: 1 },
    { percentage: 95, reps: 2 },
    { percentage: 90, reps: 4 },
    { percentage: 85, reps: 6 },
    { percentage: 80, reps: 8 },
    { percentage: 75, reps: 10 },
    { percentage: 70, reps: 12 },
    { percentage: 65, reps: 15 },
    { percentage: 60, reps: 20 },
    { percentage: 50, reps: 30 },
  ];

  return map.map(({ percentage, reps }) => ({
    percentage,
    weight: Math.round((oneRepMax * (percentage / 100)) * 4) / 4, // Round to nearest 0.25 kg
    reps,
  }));
}
