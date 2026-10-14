export interface BenchmarkRecord {
  algorithm: string;
  limit: number;
  prime_count: number;
  execution_time_ms: number;
  num_threads?: number;
  actual_threads?: number;
  num_processes?: number;
  speedup?: number | null;
  efficiency?: number | null;
  trial_count?: number;
  ranks?: MpiRankRecord[];
}

export interface MpiRankRecord {
  rank: number;
  low: number;
  high: number;
  workload: number;
  execution_time_ms: number;
}

export interface ParsedBenchmarkRow extends BenchmarkRecord {
  speedup: number | null;
  efficiency: number | null;
}

function parseMpiRecord(value: unknown): BenchmarkRecord {
  if (!value || typeof value !== "object") throw new Error("MPI benchmark JSON must contain an object.");
  const record = value as Record<string, unknown>;
  if (record.algorithm !== "mpi") throw new Error("The JSON algorithm must be mpi.");
  if (!Number.isInteger(record.limit) || (record.limit as number) < 2) throw new Error("MPI limit is invalid.");
  if (!Number.isInteger(record.prime_count) || (record.prime_count as number) < 0) throw new Error("MPI prime count is invalid.");
  if (typeof record.execution_time_ms !== "number" || !Number.isFinite(record.execution_time_ms) || record.execution_time_ms <= 0) {
    throw new Error("MPI execution time must be a positive number.");
  }
  if (!Number.isInteger(record.num_processes) || (record.num_processes as number) < 1) {
    throw new Error("MPI process count is invalid.");
  }
  return {
    algorithm: "mpi",
    limit: record.limit as number,
    prime_count: record.prime_count as number,
    execution_time_ms: record.execution_time_ms,
    num_processes: record.num_processes as number,
    trial_count: typeof record.trial_count === "number" ? record.trial_count : undefined,
    ranks: Array.isArray(record.ranks) ? record.ranks as MpiRankRecord[] : undefined,
  };
}

export function parseMpiBenchmarkJson(text: string): BenchmarkRecord[] {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Paste the JSON object printed by rank 0.");
  }
  if (Array.isArray(value)) return value.map(parseMpiRecord);
  if (!value || typeof value !== "object") throw new Error("MPI benchmark JSON must be an object.");
  const object = value as Record<string, unknown>;
  if (Array.isArray(object.results)) return object.results.map(parseMpiRecord);
  return [parseMpiRecord(value)];
}

export interface CapturedScaling {
  limit: number;
  points: Array<{ threads: number; speedup: number }>;
}

/**
 * Real captured OpenMP strong-scaling measurements from
 * results/benchmark.csv (median of 7 samples, block-partitioned sieve).
 * Used as a reference so the performance view has genuine data even
 * before the user runs a live benchmark.
 */
export const CAPTURED_OPENMP_SCALING: CapturedScaling[] = [
  { limit: 100_000, points: [{ threads: 1, speedup: 0.76 }, { threads: 2, speedup: 0.51 }, { threads: 4, speedup: 0.51 }, { threads: 8, speedup: 0.38 }] },
  { limit: 1_000_000, points: [{ threads: 1, speedup: 1.24 }, { threads: 2, speedup: 1.81 }, { threads: 4, speedup: 2.21 }, { threads: 8, speedup: 2.34 }] },
  { limit: 10_000_000, points: [{ threads: 1, speedup: 2.76 }, { threads: 2, speedup: 4.98 }, { threads: 4, speedup: 8.47 }, { threads: 8, speedup: 9.19 }] },
  { limit: 100_000_000, points: [{ threads: 1, speedup: 3.24 }, { threads: 2, speedup: 5.98 }, { threads: 4, speedup: 10.93 }, { threads: 8, speedup: 12.87 }] },
];

export const CAPTURED_METADATA = {
  source: "results/benchmark.csv",
  statistic: "median of 7 measured samples after one warm-up",
  platform: "Windows 11 · Intel64 (8 logical cores) · g++ 9.2.0 (-O2 -fopenmp)",
  timedRegion: "allocation, base-prime generation, marking and counting (JSON output excluded)",
};

export function addBenchmarkMetrics(records: BenchmarkRecord[]): ParsedBenchmarkRow[] {
  const serial = records.find((record) => record.algorithm === "serial");
  return records.map((record) => {
    const sameLimit = serial?.limit === record.limit;
    const speedup = record.algorithm === "serial"
      ? 1
      : serial && sameLimit
        ? serial.execution_time_ms / record.execution_time_ms
        : null;
    const workers = record.algorithm === "mpi" ? record.num_processes : record.actual_threads || record.num_threads;
    return { ...record, speedup, efficiency: speedup !== null && workers ? speedup / workers : null };
  });
}