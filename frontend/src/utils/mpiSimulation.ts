export type MpiStage =
  | "unprocessed"
  | "base-generation"
  | "broadcast"
  | "marking"
  | "local-count"
  | "reduce"
  | "complete";

export type MpiCellState = "unprocessed" | "processing" | "prime" | "composite";

export interface MpiRange {
  rank: number;
  low: number;
  high: number;
  workload: number;
  localPrimeCount: number;
  stage: MpiStage;
}

export interface MpiCell {
  num: number;
  rank: number;
  state: MpiCellState;
  factor?: number;
}

export interface MpiStep {
  stage: MpiStage;
  label: string;
  description: string;
  currentPrime?: number;
  activeRank?: number;
  cells: MpiCell[];
  ranks: MpiRange[];
  basePrimes: number[];
  totalPrimeCount: number;
}

export function partitionMpiRange(limit: number, processCount: number): MpiRange[] {
  if (!Number.isInteger(limit) || limit < 2) throw new Error("N must be an integer >= 2");
  if (!Number.isInteger(processCount) || processCount < 1) {
    throw new Error("Process count must be a positive integer");
  }

  const candidateCount = limit - 1;
  const quotient = Math.floor(candidateCount / processCount);
  const remainder = candidateCount % processCount;

  return Array.from({ length: processCount }, (_, rank) => {
    const workload = quotient + (rank < remainder ? 1 : 0);
    const offset = rank * quotient + Math.min(rank, remainder);
    const low = 2 + offset;
    return {
      rank,
      low,
      high: workload === 0 ? low - 1 : low + workload - 1,
      workload,
      localPrimeCount: 0,
      stage: "unprocessed",
    };
  });
}

function basePrimesThrough(limit: number): number[] {
  const root = Math.floor(Math.sqrt(limit));
  const flags = Array(root + 1).fill(true) as boolean[];
  flags[0] = false;
  if (root >= 1) flags[1] = false;
  const primes: number[] = [];
  for (let p = 2; p <= root; p += 1) {
    if (!flags[p]) continue;
    primes.push(p);
    for (let multiple = p * p; multiple <= root; multiple += p) flags[multiple] = false;
  }
  return primes;
}

function cloneRanges(ranges: MpiRange[], stage: MpiStage, activeRank?: number): MpiRange[] {
  return ranges.map((range) => ({
    ...range,
    stage: activeRank === undefined || activeRank === range.rank ? stage : range.stage,
  }));
}

export function generateMpiSimulation(limit = 30, processCount = 4): {
  steps: MpiStep[];
  ranges: MpiRange[];
} {
  const ranges = partitionMpiRange(limit, processCount);
  const basePrimes = basePrimesThrough(limit);
  const primeFlags = Array(limit + 1).fill(true) as boolean[];
  primeFlags[0] = false;
  primeFlags[1] = false;
  const cells = Array.from({ length: limit - 1 }, (_, index) => ({
    num: index + 2,
    rank: ranges.find((range) => range.low <= index + 2 && index + 2 <= range.high)?.rank ?? 0,
    state: "unprocessed" as MpiCellState,
  }));
  const steps: MpiStep[] = [];
  const snapshot = (
    stage: MpiStage,
    label: string,
    description: string,
    currentCells: MpiCell[],
    currentRanges: MpiRange[],
    currentPrime?: number,
    activeRank?: number,
  ) => steps.push({
    stage,
    label,
    description,
    currentPrime,
    activeRank,
    cells: currentCells.map((cell) => ({ ...cell })),
    ranks: currentRanges.map((range) => ({ ...range })),
    basePrimes: [...basePrimes],
    totalPrimeCount: currentCells.filter((cell) => cell.state === "prime").length,
  });

  snapshot("unprocessed", "Initial distribution", `Values 2-${limit} are distributed across ${processCount} MPI ranks.`, cells, ranges);

  for (const prime of basePrimes) {
    const primeCell = cells.find((cell) => cell.num === prime);
    if (primeCell) primeCell.state = "processing";
    snapshot("base-generation", `Base prime ${prime}`, `Rank 0 generated base prime ${prime} while preparing the shared factor list.`, cells, cloneRanges(ranges, "base-generation"), prime);
    snapshot("broadcast", "MPI_Bcast", `Rank 0 broadcasts base prime ${prime} to every rank before marking.`, cells, cloneRanges(ranges, "broadcast"), prime);

    for (const cell of cells) {
      if (cell.num % prime === 0 && cell.num !== prime && cell.num >= prime * prime) {
        primeFlags[cell.num] = false;
        cell.state = "composite";
        cell.factor = prime;
      }
    }
    if (primeCell) primeCell.state = "processing";
    snapshot("marking", `Mark multiples of ${prime}`, `Each rank marks multiples of ${prime} only inside its owned range.`, cells, cloneRanges(ranges, "marking"), prime);
  }

  for (const cell of cells) {
    if (primeFlags[cell.num]) cell.state = "prime";
  }
  const countedRanges = ranges.map((range) => ({
    ...range,
    stage: "local-count" as MpiStage,
    localPrimeCount: cells.filter((cell) => cell.rank === range.rank && cell.state === "prime").length,
  }));
  snapshot("local-count", "Local counts", "Each rank counts the prime values in its own segment.", cells, countedRanges);
  snapshot("reduce", "MPI_Reduce", "MPI_Reduce sums the local prime counts at rank 0.", cells, cloneRanges(countedRanges, "reduce"));
  snapshot("complete", "Complete", `Rank 0 receives the reduced total: ${cells.filter((cell) => cell.state === "prime").length} primes.`, cells, cloneRanges(countedRanges, "complete"));

  return { steps, ranges };
}