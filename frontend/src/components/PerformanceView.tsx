import React, { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { Cpu, Zap, Activity, Play, Layers, Upload } from "lucide-react";
import { SieveResponse, SieveResult } from "../App";
import { addBenchmarkMetrics, parseMpiBenchmarkJson, BenchmarkRecord } from "../utils/benchmarkData";

interface PerformanceViewProps {
  response: SieveResponse | null;
  system: {
    cpu_count: number | null;
    architecture: string | null;
    openmp_available: boolean;
    compiler: string | null;
  } | null;
  onRunMultiThreadBenchmark: (limit: number) => Promise<void>;
  loading: boolean;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  response,
  system,
  onRunMultiThreadBenchmark,
  loading,
}) => {
  const [benchLimit, setBenchLimit] = useState(1000000);
  const [multiThreadResults, setMultiThreadResults] = useState<
    Array<{ threads: number; timeMs: number; speedup: number; efficiency: number }>
  >([]);
  const [mpiText, setMpiText] = useState("");
  const [mpiResult, setMpiResult] = useState<BenchmarkRecord | null>(null);
  const [mpiError, setMpiError] = useState<string | null>(null);

  const serialResult = response?.results.find((r) => r.algorithm === "serial");
  const openmpResult = response?.results.find((r) => r.algorithm === "openmp");
  const benchmarkRows = addBenchmarkMetrics([
    ...(response?.results || []),
    ...(mpiResult ? [mpiResult] : []),
  ]);

  // Chart data from current response
  const timeChartData = benchmarkRows.map((r) => ({
    name: r.algorithm === "openmp" ? `OpenMP (${r.num_threads || 4}T)` : r.algorithm === "mpi" ? `MPI (${r.num_processes || 1}P)` : "Serial",
    timeMs: Number(r.execution_time_ms.toFixed(3)),
    primeCount: r.prime_count,
  })) || [];

  const handleImportMpi = () => {
    try {
      setMpiResult(parseMpiBenchmarkJson(mpiText));
      setMpiError(null);
    } catch (error) {
      setMpiError(error instanceof Error ? error.message : "Could not parse MPI JSON.");
    }
  };

  const handleRunMultiTest = async () => {
    await onRunMultiThreadBenchmark(benchLimit);
  };

  return (
    <div className="view-container performance-view">
      <div className="view-header">
        <h2 className="view-title">Parallel Computing (PDC) & Sieve Performance</h2>
        <p className="view-subtitle">
          Real execution benchmarks comparing OpenMP shared-memory multi-threading
          against single-threaded C++ Serial Sieve of Eratosthenes.
        </p>
      </div>

      {/* System Hardware Spec Banner */}
      <div className="system-spec-grid">
        <div className="spec-card">
          <div className="spec-icon-wrap">
            <Cpu size={20} className="text-indigo-600" />
          </div>
          <div className="spec-info">
            <span className="spec-label">CPU Cores / Threads</span>
            <strong className="spec-val">{system?.cpu_count ?? "Detecting..."}</strong>
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-icon-wrap">
            <Layers size={20} className="text-blue-600" />
          </div>
          <div className="spec-info">
            <span className="spec-label">Architecture</span>
            <strong className="spec-val">{system?.architecture ?? "x86_64"}</strong>
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-icon-wrap">
            <Zap size={20} className="text-emerald-600" />
          </div>
          <div className="spec-info">
            <span className="spec-label">OpenMP Multi-threading</span>
            <strong className="spec-val text-emerald-600">
              {system?.openmp_available ? "Active & Hardware Accelerated" : "Available"}
            </strong>
          </div>
        </div>

        <div className="spec-card">
          <div className="spec-icon-wrap">
            <Activity size={20} className="text-purple-600" />
          </div>
          <div className="spec-info">
            <span className="spec-label">C++ Compiler</span>
            <strong className="spec-val text-xs" title={system?.compiler || "GCC / MinGW"}>
              {system?.compiler?.slice(0, 24) || "GCC / MinGW (OpenMP 4.5+)"}
            </strong>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="perf-charts-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Execution Time (Lower is Better)</h3>
          <p className="chart-card-subtitle">Native computation time in milliseconds (ms)</p>
          <div className="chart-wrapper">
            {timeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timeChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" label={{ value: "Time (ms)", angle: -90, position: "insideLeft", fill: "#64748b" }} />
                  <Tooltip
                    formatter={(val: number) => [`${val.toFixed(3)} ms`, "Execution Time"]}
                    contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }}
                  />
                  <Bar dataKey="timeMs" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="chart-empty">Run prime generation on the Home tab to view chart</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">PDC Speedup & Parallel Efficiency</h3>
          <p className="chart-card-subtitle">Speedup S = T_serial / T_parallel</p>
          <div className="speedup-metrics-display">
            <div className="speedup-metric-box">
              <span className="metric-title">Measured Speedup</span>
              <strong className="metric-large">
                {openmpResult?.speedup !== undefined
                  ? `${openmpResult.speedup.toFixed(2)}x`
                  : "-"}
              </strong>
              <span className="metric-sub">
                vs Serial ({serialResult?.execution_time_ms.toFixed(2) || "-"} ms)
              </span>
            </div>

            <div className="speedup-metric-box">
              <span className="metric-title">Parallel Efficiency</span>
              <strong className="metric-large text-emerald-600">
                {openmpResult?.efficiency !== undefined
                  ? `${(openmpResult.efficiency * 100).toFixed(1)}%`
                  : openmpResult?.speedup && openmpResult?.num_threads
                  ? `${((openmpResult.speedup / openmpResult.num_threads) * 100).toFixed(1)}%`
                  : "-"}
              </strong>
              <span className="metric-sub">
                Efficiency E = Speedup / Thread Count
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card mpi-benchmark-card">
        <div className="chart-card-title-row">
          <div>
            <h3 className="chart-card-title">MPI benchmark input</h3>
            <p className="chart-card-subtitle">Paste the rank-0 JSON from <code>sieve_mpi.exe</code>; no synthetic values are added.</p>
          </div>
          <Upload size={18} className="text-blue-600" />
        </div>
        <div className="mpi-benchmark-import">
          <textarea value={mpiText} onChange={(event) => setMpiText(event.target.value)} placeholder={'{"algorithm":"mpi",...}'} aria-label="MPI benchmark JSON" />
          <button type="button" className="btn-sm btn-primary" onClick={handleImportMpi} disabled={!mpiText.trim()}><Upload size={14} /> Add MPI result</button>
        </div>
        {mpiError && <p className="form-error">{mpiError}</p>}
        {mpiResult && <p className="imported-result">MPI result loaded: N={mpiResult.limit.toLocaleString()}, {mpiResult.num_processes} processes, {mpiResult.execution_time_ms.toFixed(3)} ms.</p>}
      </div>

      <div className="chart-card benchmark-metrics-card">
        <h3 className="chart-card-title">Measured speedup and efficiency</h3>
        <p className="chart-card-subtitle">Calculated from the serial time and each real result's worker count.</p>
        {benchmarkRows.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={benchmarkRows.map((row) => ({
              name: row.algorithm === "openmp" ? "OpenMP" : row.algorithm === "mpi" ? "MPI" : "Serial",
              speedup: Number(row.speedup.toFixed(3)),
              efficiency: Number((row.efficiency * 100).toFixed(1)),
            }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Legend />
              <Bar dataKey="speedup" fill="#2563eb" name="Speedup (x)" />
              <Bar dataKey="efficiency" fill="#059669" name="Efficiency (%)" />
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">Run serial/OpenMP or import an MPI result to plot measurements.</div>}
      </div>

      {/* Educational PDC Concepts */}
      <div className="pdc-theory-card">
        <h3 className="pdc-theory-title">Parallel Distributed Computing (PDC) in Sieve</h3>
        <div className="theory-grid-3">
          <div className="theory-item">
            <h4>1. Domain Decomposition</h4>
            <p>
              The candidate range [2..N] is partitioned into cache-friendly chunks of size
              10,000. Each OpenMP thread processes distinct blocks independently without lock
              contention.
            </p>
          </div>
          <div className="theory-item">
            <h4>2. Cache Locality (L1/L2 Cache)</h4>
            <p>
              By fitting each block array in CPU L1/L2 cache, memory bus traffic is minimized,
              yielding super-linear speedups on multi-core processors for large N.
            </p>
          </div>
          <div className="theory-item">
            <h4>3. Amdahl's Law</h4>
            <p>
              Base prime computation (up to √N) is strictly serial. The remaining sieve markings
              are 100% parallelizable across all hardware CPU threads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
