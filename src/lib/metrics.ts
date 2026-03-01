/**
 * Calculate BMI from weight (kg) and height (cm).
 */
export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

/**
 * BMI category label.
 */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25)   return 'Normal weight';
  if (bmi < 30)   return 'Overweight';
  return 'Obese';
}

/**
 * Calculate weekly volume for a session (sets × reps × weight).
 */
export function calculateVolume(sets: { reps: number | null; weightKg: number | null }[]): number {
  return sets.reduce((total, set) => {
    if (set.reps && set.weightKg) return total + set.reps * set.weightKg;
    return total;
  }, 0);
}
