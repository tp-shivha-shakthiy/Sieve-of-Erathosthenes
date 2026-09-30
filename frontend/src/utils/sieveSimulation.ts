/**
 * Sieve of Eratosthenes Visual Simulation Data & State
 */

export interface SieveNumberState {
  num: number;
  isPrime: boolean;
  isCurrentPrime?: boolean;
  isMultipleOf?: number;
  isCurrentMultiple?: boolean;
}

export interface SieveStep {
  currentPrime: number;
  markedMultiples: number[];
  grid: SieveNumberState[];
  description: string;
}

export function generateSieveSimulation(maxNumber: number = 30): {
  steps: SieveStep[];
  allNumbers: SieveNumberState[];
} {
  const isPrime = new Array(maxNumber + 1).fill(true);
  isPrime[0] = false;
  isPrime[1] = false;

  const currentStates: SieveNumberState[] = [];
  for (let i = 2; i <= maxNumber; i++) {
    currentStates.push({
      num: i,
      isPrime: true,
    });
  }

  const steps: SieveStep[] = [];

  // Step 0: Initial state
  steps.push({
    currentPrime: 0,
    markedMultiples: [],
    grid: currentStates.map((s) => ({ ...s })),
    description: "Start with all candidate numbers marked as prime candidates (green).",
  });

  for (let p = 2; p * p <= maxNumber; p++) {
    if (isPrime[p]) {
      const markedInThisStep: number[] = [];

      for (let multiple = p * p; multiple <= maxNumber; multiple += p) {
        if (isPrime[multiple]) {
          isPrime[multiple] = false;
          markedInThisStep.push(multiple);
        }
      }

      // Update states
      for (const item of currentStates) {
        if (item.num === p) {
          item.isCurrentPrime = true;
        } else {
          item.isCurrentPrime = false;
        }

        if (markedInThisStep.includes(item.num)) {
          item.isPrime = false;
          item.isMultipleOf = p;
          item.isCurrentMultiple = true;
        } else {
          item.isCurrentMultiple = false;
        }
      }

      steps.push({
        currentPrime: p,
        markedMultiples: markedInThisStep,
        grid: currentStates.map((s) => ({ ...s })),
        description: `Selected prime ${p}: Marked multiples (${p}², ${p}²+${p}, ...) = [${markedInThisStep.join(", ")}] as non-prime.`,
      });
    }
  }

  // Final step
  const finalGrid = currentStates.map((s) => ({
    ...s,
    isCurrentPrime: false,
    isCurrentMultiple: false,
    isPrime: isPrime[s.num],
  }));

  steps.push({
    currentPrime: 0,
    markedMultiples: [],
    grid: finalGrid,
    description: `Sieve complete! All uncrossed numbers up to ${maxNumber} are guaranteed prime numbers.`,
  });

  return {
    steps,
    allNumbers: finalGrid,
  };
}
