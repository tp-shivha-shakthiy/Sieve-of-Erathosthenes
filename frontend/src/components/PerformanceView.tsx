import React, { useMemo, useState } from "react";
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
  Cell,
} from "recharts";
import { Cpu, Layers, Zap, Activity, Play, Upload, Loader2, TrendingUp, Info } from "lucide-react";
import { SieveResponse } from "../App";
import {
  parseMpiBenchmarkJson,
  BenchmarkRecord,
  CAPTURED_OPENMP_SCALING,
  CAPTURED_METADATA,
} from "../utils/benchmarkData";

interface PerformanceViewProps {
  response: SieveResponse | null;
  system: {
    cpu_count: number | null;
    architecture: string | null;
    openmp_available: boolean;
    compiler: string | null;
  } | null;
  onRunMultiThreadBenchmark: (limit: number, mpiProcesses: number[]) => Promise<void>;
  loading: boolean;
  error: string | null;
}

const DARK_GRID = "#233149";
const AXIS = "#94a3b8";
const TOOLTIP_STYLE: React.CSSProperties = {
  background: "#0f1a2e",
  border: "1px solid #2b3b57",
  borderRadius: 8,
  color: "#e2e8f0",
  fontSize: "0.78rem",
};

interface Measurement {
  key: string;
  label: string;
  algorithm: string;
  workers: number | null;
  timeMs: number | null;
  primeCount: number | null;
  speedup: number | null;
  efficiency: number | null;
}

export const PerformanceView: React.FC<PerformanceViewProps> = ({
  response,
  system,
  onRunMultiThreadBenchmark,
  loading,
  error,
}) => {
  const [benchLimit, setBenchLimit] = useState(1_000_000);
  const [mpiProcesses, setMpiProcesses] = useState([1, 2, 4, 8]);
  const [mpiText, setMpiText] = useState("");
  const [mpiResults, setMpiResults] = useState<BenchmarkRecord[]>([]);
  const [mpiError, setMpiError] = useState<string | null>(null);

  const serialResult = response?.results.find((r) => r.algorithm === "serial");
  const openmpResult = response?.results.find((r) => r.algorithm === "openmp");
  const liveMpiResults = (response?.results.filter((r) => r.algorithm === "mpi") ?? []) as BenchmarkRecord[];
  const activeMpiResults = liveMpiResults.length > 0 ? liveMpiResults : mpiResults;
  const serialTime = serialResult?.execution_time_ms ?? null;

  const measurements = useMemo<Measurement[]>(() => {
    const build = (
      key: string,
      label: string,
      algorithm: string,
      limit: number | null,
      workers: number | null,
      timeMs: number | null,
      primeCount: number | null,
    ): Measurement => {
      const speedup = timeMs && serialTime && limit === serialResult?.limit
        ? serialTime / timeMs
        : algorithm === "serial" && timeMs
          ? 1
          : null;
      return {
        key,
        label,
        algorithm,
        workers,
        timeMs,
        primeCount,
        speedup,
        efficiency: speedup && workers ? speedup / workers : null,
      };
    };

    return [
      build("serial", "Serial", "serial", serialResult?.limit ?? null, 1, serialTime, serialResult?.prime_count ?? null),
      build(
        "openmp",
        "OpenMP",
        "openmp",
        openmpResult?.limit ?? null,
        openmpResult?.num_threads ?? openmpResult?.actual_threads ?? null,
        openmpResult?.execution_time_ms ?? null,
        openmpResult?.prime_count ?? null,
      ),
      build(
        "mpi",
        "MPI",
        "mpi",
        activeMpiResults[0]?.limit ?? null,
        activeMpiResults[0]?.num_processes ?? null,
        activeMpiResults[0]?.execution_time_ms ?? null,
        activeMpiResults[0]?.prime_count ?? null,
      ),
      ...activeMpiResults.slice(1).map((result) => build(
        `mpi-${result.num_processes}`,
        `MPI (${result.num_processes} processes)`,
        "mpi",
        result.limit,
        result.num_processes ?? null,
        result.execution_time_ms,
        result.prime_count,
      )),
    ];
  }, [serialTime, serialResult, openmpResult, activeMpiResults]);

  const presentTime = measurements.filter((m) => m.timeMs != null);
  const presentSpeedup = measurements.filter((m) => m.speedup != null);

  const handleImportMpi = () => {
    try {
      setMpiResults(parseMpiBenchmarkJson(mpiText));
      setMpiError(null);
    } catch (error) {
      setMpiError(error instanceof Error ? error.message : "Could not parse MPI JSON.");
    }
  };

  const scalingData = useMemo(() => {
    const threads = [1, 2, 4, 8];
    return threads.map((t) => {
      const row: Record<string, number | null> = { threads: t };
      for (const entry of CAPTURED_OPENMP_SCALING) {
        const point = entry.points.find((p) => p.threads === t);
        row[`OpenMP N=${entry.limit.toLocaleString()}`] = point ? point.speedup : null;
      }
      for (const limit of [...new Set(activeMpiResults.map((result) => result.limit))]) {
        const result = activeMpiResults.find((candidate) => candidate.limit === limit && candidate.num_processes === t);
        const serialForLimit = serialResult?.limit === limit ? serialTime : null;
        row[`MPI N=${limit.toLocaleString()}`] = result && serialForLimit ? serialForLimit / result.execution_time_ms : null;
      }
      return row;
    });
  }, [activeMpiResults, serialResult, serialTime]);

  const scalingColors = ["#38bdf8", "#34d399", "#fbbf24", "#f472b6"];

  const specValue = (value: string | number | null | undefined, fallback = "Not available") =>
    value === null || value === undefined || value === "" ? fallback : String(value);

  return (
    <div className="view-container performance-view viz-console">
      <header className="console-head">
        <div>
          <span className="console-kicker">High-Performance Computing · Benchmarks</span>
          <h2 className="console-title">Serial vs OpenMP vs MPI Performance</h2>
          <p className="console-sub">
            Charts are drawn only from real measurements: a live run here, or a pasted rank-0 MPI result.
            Missing values are shown as “—”, never invented.
          </p>
        </div>
      </header>

      {/* Hardware specification */}
      <div className="spec-grid">
        <div className="spec-tile">
          <Cpu size={18} />
          <div>
            <span>Logical CPUs</span>
            <strong>{specValue(system?.cpu_count)}</strong>
          </div>
        </div>
        <div className="spec-tile">
          <Layers size={18} />
          <div>
            <span>Architecture</span>
            <strong>{specValue(system?.architecture)}</strong>
          </div>
        </div>
        <div className="spec-tile">
          <Zap size={18} />
          <div>
            <span>OpenMP runtime</span>
            <strong className={system?.openmp_available ? "ok" : "muted"}>
              {system?.openmp_available ? "Detected" : "Not detected"}
            </strong>
          </div>
        </div>
        <div className="spec-tile">
          <Activity size={18} />
          <div>
            <span>C++ compiler</span>
            <strong title={system?.compiler || undefined}>{specValue(system?.compiler, "Not reported")}</strong>
          </div>
        </div>
      </div>

      {/* Live benchmark runner */}
      <section className="console-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">1</span>
            <div>
              <h3>Live measurement</h3>
              <p>Run native Serial, OpenMP, and MPI timings at the same N.</p>
            </div>
          </div>
          <div className="bench-run">
            <label className="param-field">
              N
              <input
                type="number"
                min={2}
                max={100_000_000}
                step={1000}
                value={benchLimit}
                onChange={(event) => setBenchLimit(Math.max(2, Number(event.target.value) || 2))}
              />
            </label>
            <button
              type="button"
              className="tbtn primary"
              onClick={() => onRunMultiThreadBenchmark(benchLimit, mpiProcesses)}
              disabled={loading || mpiProcesses.length === 0}
            >
              {loading ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
              <span>{loading ? "Running…" : "Run benchmark"}</span>
            </button>
          </div>
        </div>
        <div className="mpi-process-controls" aria-label="MPI process counts">
          <span>MPI processes</span>
          {[1, 2, 4, 8].map((processCount) => (
            <label key={processCount}>
              <input
                type="checkbox"
                checked={mpiProcesses.includes(processCount)}
                onChange={() => setMpiProcesses((current) => current.includes(processCount)
                  ? current.filter((value) => value !== processCount)
                  : [...current, processCount].sort((left, right) => left - right))}
              />
              {processCount}
            </label>
          ))}
        </div>
        {error && <p className="form-error">{error}</p>}

        <div className="measure-table">
          <div className="measure-row head">
            <span>Algorithm</span>
            <span>Workers</span>
            <span>Time (ms)</span>
            <span>Primes</span>
            <span>Speedup</span>
            <span>Efficiency</span>
          </div>
          {measurements.map((m) => (
            <div key={m.key} className={`measure-row alg-${m.algorithm} ${m.timeMs == null ? "is-missing" : ""}`}>
              <span className="measure-alg"><i className={`alg-dot alg-${m.algorithm}`} />{m.label}</span>
              <span>{m.workers ?? "—"}</span>
              <span>{m.timeMs != null ? m.timeMs.toFixed(3) : "—"}</span>
              <span>{m.primeCount != null ? m.primeCount.toLocaleString() : "—"}</span>
              <span>{m.speedup != null ? `${m.speedup.toFixed(2)}×` : "—"}</span>
              <span>{m.efficiency != null ? `${(m.efficiency * 100).toFixed(1)}%` : "—"}</span>
            </div>
          ))}
        </div>

        <div className="perf-charts-grid">
          <div className="chart-card">
            <h4 className="chart-card-title">Execution time (lower is better)</h4>
            <p className="chart-card-subtitle">Milliseconds, measured on this machine</p>
            <div className="chart-wrapper">
              {presentTime.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={presentTime.map((m) => ({ name: m.label, timeMs: Number(m.timeMs!.toFixed(3)) }))} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} tickLine={false} />
                    <YAxis stroke={AXIS} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toFixed(3)} ms`, "Time"]} />
                    <Bar dataKey="timeMs" radius={[6, 6, 0, 0]}>
                      {presentTime.map((m) => (
                        <Cell
                          key={m.key}
                          fill={m.algorithm === "serial" ? "#f472b6" : m.algorithm === "openmp" ? "#34d399" : "#38bdf8"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">Run a benchmark or import an MPI result to plot timings.</div>
              )}
            </div>
          </div>

          <div className="chart-card">
            <h4 className="chart-card-title">Speedup S = T_serial / T_parallel</h4>
            <p className="chart-card-subtitle">Bars show speedup; secondary axis shows efficiency</p>
            <div className="chart-wrapper">
              {presentSpeedup.length > 1 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={presentSpeedup.map((m) => ({
                      name: m.label,
                      speedup: Number((m.speedup ?? 0).toFixed(2)),
                      efficiency: Number(((m.efficiency ?? 0) * 100).toFixed(1)),
                    }))}
                    margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} vertical={false} />
                    <XAxis dataKey="name" stroke={AXIS} tickLine={false} />
                    <YAxis stroke={AXIS} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
                    <Bar dataKey="speedup" fill="#818cf8" name="Speedup (×)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="efficiency" fill="#22d3ee" name="Efficiency (%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  Speedup needs a serial baseline plus at least one parallel result (OpenMP or MPI).
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MPI import */}
      <section className="console-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">2</span>
            <div>
              <h3><Upload size={16} /> MPI benchmark input</h3>
              <p>
                Paste one rank-0 JSON object or the array produced by the MPI capture script. No synthetic
                values are added.
              </p>
            </div>
          </div>
          {mpiResults.length > 0 && (
            <button type="button" className="tbtn" onClick={() => { setMpiResults([]); setMpiText(""); setMpiError(null); }}>
              Clear
            </button>
          )}
        </div>
        <div className="mpi-benchmark-import">
          <textarea
            value={mpiText}
            onChange={(event) => setMpiText(event.target.value)}
            placeholder={'{"algorithm":"mpi","limit":100000,"num_processes":4,"prime_count":9592,"execution_time_ms":0.42}'}
            aria-label="MPI benchmark JSON"
          />
          <button type="button" className="tbtn primary" onClick={handleImportMpi} disabled={!mpiText.trim()}>
            <Upload size={15} /> Add result
          </button>
        </div>
        {mpiError && <p className="form-error">{mpiError}</p>}
        {activeMpiResults.length > 0 && (
          <p className="imported-result">
            Loaded {activeMpiResults.length} MPI measurement{activeMpiResults.length === 1 ? "" : "s"}: N={activeMpiResults[0].limit.toLocaleString()} ·{" "}
            {activeMpiResults.map((result) => `${result.num_processes}p ${result.execution_time_ms.toFixed(3)} ms`).join(" · ")}
          </p>
        )}
        {activeMpiResults.some((result) => result.ranks?.length) && (
          <table className="mpi-rank-table">
            <thead><tr><th>Rank</th><th>Range</th><th>Workload</th><th>Time (ms)</th></tr></thead>
            <tbody>{(activeMpiResults.find((result) => result.ranks?.length)?.ranks ?? []).map((rank) => (
              <tr key={rank.rank}><td>{rank.rank}</td><td>[{rank.low}, {rank.high}]</td><td>{rank.workload.toLocaleString()}</td><td>{rank.execution_time_ms.toFixed(3)}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>

      {/* Captured reference scaling */}
      <section className="console-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">3</span>
            <div>
              <h3><TrendingUp size={16} /> Captured OpenMP scaling (reference)</h3>
              <p>
                Real strong-scaling speedup vs threads from a recorded run. {CAPTURED_METADATA.statistic}.
              </p>
            </div>
          </div>
        </div>
        <div className="chart-wrapper">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={scalingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={DARK_GRID} />
              <XAxis dataKey="threads" stroke={AXIS} tickLine={false} label={{ value: "OpenMP threads", position: "insideBottom", offset: -4, fill: AXIS, fontSize: 11 }} />
              <YAxis stroke={AXIS} tickLine={false} axisLine={false} label={{ value: "Speedup (×)", angle: -90, position: "insideLeft", fill: AXIS, fontSize: 11 }} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => `${value.toFixed(2)}×`} />
              <Legend wrapperStyle={{ fontSize: "0.72rem" }} />
              {CAPTURED_OPENMP_SCALING.map((entry, index) => (
                <Line
                  key={entry.limit}
                  type="monotone"
                  dataKey={`OpenMP N=${entry.limit.toLocaleString()}`}
                  stroke={scalingColors[index % scalingColors.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
              {[...new Set(activeMpiResults.map((result) => result.limit))].map((limit) => (
                <Line key={`mpi-${limit}`} type="monotone" dataKey={`MPI N=${limit.toLocaleString()}`} stroke="#fb923c" strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="captured-note">
          <Info size={13} /> Source: {CAPTURED_METADATA.source} · {CAPTURED_METADATA.platform} · Timed region:{" "}
          {CAPTURED_METADATA.timedRegion}. These are machine-specific reference numbers, not produced on this session.
        </p>
      </section>

      {/* Accurate PDC notes */}
      <section className="console-card notes-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">i</span>
            <div>
              <h3>Reading the numbers</h3>
              <p>How to interpret the serial, OpenMP and MPI measurements.</p>
            </div>
          </div>
        </div>
        <ul className="notes-list">
          <li><b>Baseline:</b> speedup is always relative to the serial run of the same N in this session.</li>
          <li><b>Block partitioning:</b> the OpenMP version splits [2, N] into cache-sized blocks, which is why speedup can exceed the thread count at large N.</li>
          <li><b>MPI:</b> rank 0 builds the base primes ≤ √N, broadcasts them, every rank marks its own contiguous range and reduces the local counts. Its time includes the barrier and communication, so it will trail a purely shared-memory run on one node.</li>
          <li><b>Small N:</b> for N ≤ 10⁴ the work is dominated by process/thread startup, so speedup above 1 is not expected.</li>
        </ul>
      </section>
    </div>
  );
};
