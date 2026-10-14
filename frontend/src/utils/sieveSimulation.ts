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

/* ------------------------------------------------------------------ *
 * Rich visualization model used by the interactive "lab" view.       *
 * Kept separate from the legacy step model above so the Home page    *
 * keeps its original candidate-strip behaviour.                      *
 * ------------------------------------------------------------------ */

export type SieveVizState = "unprocessed" | "active" | "prime" | "composite";

export interface SieveVizCell {
  num: number;
  state: SieveVizState;
  factor?: number;
  justMarked?: boolean;
}

export interface SieveVizStep {
  index: number;
  currentPrime: number;
  newMarked: number[];
  columns: number;
  cells: SieveVizCell[];
  description: string;
  phase: "init" | "eliminate" | "complete";
  primeCount: number;
  eliminatedCount: number;
}

export interface SieveVizSimulation {
  steps: SieveVizStep[];
  primes: number[];
  columns: number;
}

export function generateSieveVizSteps(maxNumber = 30): SieveVizSimulation {
  const isComposite = new Array<boolean>(maxNumber + 1).fill(false);
  const cells: SieveVizCell[] = Array.from({ length: maxNumber - 1 }, (_, i) => ({
    num: i + 2,
    state: "unprocessed" as SieveVizState,
  }));

  const clone = (): SieveVizCell[] => cells.map((cell) => ({ ...cell }));
  const eliminatedCount = () => cells.filter((c) => c.state === "composite").length;
  const columns = Math.min(10, Math.max(5, maxNumber - 1));

  const steps: SieveVizStep[] = [];
  steps.push({
    index: 0,
    currentPrime: 0,
    newMarked: [],
    columns,
    cells: clone(),
    description: `Candidates 2–${maxNumber} start unprocessed. Every number is still a prime candidate.`,
    phase: "init",
    primeCount: 0,
    eliminatedCount: 0,
  });

  for (let p = 2; p * p <= maxNumber; p += 1) {
    if (isComposite[p]) continue;

    for (const cell of cells) cell.justMarked = false;
    const markedNow: number[] = [];
    for (let multiple = p * p; multiple <= maxNumber; multiple += p) {
      if (isComposite[multiple]) continue;
      isComposite[multiple] = true;
      const cell = cells[multiple - 2];
      cell.state = "composite";
      cell.factor = p;
      cell.justMarked = true;
      markedNow.push(multiple);
    }

    const primeCell = cells[p - 2];
    primeCell.state = "active";
    steps.push({
      index: steps.length,
      currentPrime: p,
      newMarked: markedNow,
      columns,
      cells: clone(),
      description: markedNow.length
        ? `Select prime ${p}. Mark its multiples from p² = ${p * p}: ${markedNow.join(", ")}.`
        : `Prime ${p} is selected; p² exceeds ${maxNumber}, so it marks nothing new.`,
      phase: "eliminate",
      primeCount: 0,
      eliminatedCount: eliminatedCount(),
    });
    primeCell.state = "unprocessed";
  }

  const primes: number[] = [];
  for (const cell of cells) {
    if (cell.state === "unprocessed") {
      cell.state = "prime";
      primes.push(cell.num);
    }
  }
  steps.push({
    index: steps.length,
    currentPrime: 0,
    newMarked: [],
    columns,
    cells: clone(),
    description: `Sieve complete. Every number without a mark is prime: ${primes.length} primes ≤ ${maxNumber}.`,
    phase: "complete",
    primeCount: primes.length,
    eliminatedCount: eliminatedCount(),
  });

  return { steps, primes, columns };
}
