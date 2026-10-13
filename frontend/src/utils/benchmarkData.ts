export interface BenchmarkRecord {
  algorithm: string;
  limit: number;
  prime_count: number;
  execution_time_ms: number;
  num_threads?: number;
  actual_threads?: number;
  num_processes?: number;
  speedup?: number;
  efficiency?: number;
}

export interface ParsedBenchmarkRow extends BenchmarkRecord {
  speedup: number;
  efficiency: number;
}

export function parseMpiBenchmarkJson(text: string): BenchmarkRecord {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Paste the JSON object printed by rank 0.");
  }
  if (!value || typeof value !== "object") throw new Error("MPI benchmark JSON must be an object.");
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
  };
}

export function addBenchmarkMetrics(records: BenchmarkRecord[]): ParsedBenchmarkRow[] {
  const serial = records.find((record) => record.algorithm === "serial");
  return records.map((record) => {
    const speedup = record.algorithm === "serial" || !serial
      ? 1
      : serial.execution_time_ms / record.execution_time_ms;
    const workers = record.algorithm === "mpi" ? record.num_processes : record.actual_threads || record.num_threads;
    return { ...record, speedup, efficiency: workers ? speedup / workers : 1 };
  });
}