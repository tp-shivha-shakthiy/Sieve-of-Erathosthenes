import { useEffect, useState } from "react";
import SieveControls from "./components/SieveControls";
import PrimeGrid from "./components/PrimeGrid";
import PerformanceChart from "./components/PerformanceChart";
import SpeedupChart from "./components/SpeedupChart";
import SummaryMetrics from "./components/SummaryMetrics";
import JsonViewer from "./components/JsonViewer";

export interface SieveResult {
  algorithm: string;
  limit: number;
  prime_count: number;
  execution_time_ms: number;
  num_threads?: number;
  primes: number[];
  speedup?: number;
}

export interface SieveResponse {
  results: SieveResult[];
  parameters: {
    limit: number;
    algorithm: string;
    num_threads: number;
    return_primes: boolean;
  };
}

interface SystemInfo {
  cpu_count: number | null;
  architecture: string | null;
  openmp_available: boolean;
  compiler: string | null;
}

interface RunHistoryEntry {
  timestamp: string;
  durationMs: number;
  response: SieveResponse;
}

export default function App() {
  const [response, setResponse] = useState<SieveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [limit, setLimit] = useState(1000);
  const [algorithm, setAlgorithm] = useState("both");
  const [numThreads, setNumThreads] = useState(4);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [history, setHistory] = useState<RunHistoryEntry[]>([]);
  const [lastRun, setLastRun] = useState<{ timestamp: string; durationMs: number } | null>(null);

  const navigateTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    fetch("/api/system")
      .then((res) => res.ok ? res.json() : null)
      .then((info: SystemInfo | null) => setSystem(info))
      .catch(() => setSystem(null));
  }, []);

  const runSieve = async (
    limit: number,
    algorithm: string,
    numThreads: number
  ) => {
    const startedAt = performance.now();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit,
          algorithm,
          num_threads: numThreads,
          return_primes: limit <= 100000,
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.detail || "Request failed");
      }
      const nextResponse = await res.json() as SieveResponse;
      setResponse(nextResponse);
      const runDetails = {
        timestamp: new Date().toLocaleTimeString(),
        durationMs: Math.round(performance.now() - startedAt),
      };
      setLastRun(runDetails);
      setHistory((currentHistory) => [
        { ...runDetails, response: nextResponse },
        ...currentHistory,
      ].slice(0, 5));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const copyResults = async () => {
    if (!response) return;
    await navigator.clipboard.writeText(JSON.stringify(response, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const serial = response?.results.find((result) => result.algorithm === "serial");
  const openmp = response?.results.find((result) => result.algorithm === "openmp");
  const speedup = openmp?.speedup;
  const validation = serial && openmp
    ? serial.prime_count === openmp.prime_count ? "Counts match" : "Count mismatch"
    : response ? "Single result" : "Awaiting run";
  const fastest = response ? response.results.reduce((best, result) => result.execution_time_ms < best.execution_time_ms ? result : best) : null;

  return (
    <>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">✣</span><span>Sieve of Eratosthenes</span></div>
        <div className="utility-icons">
          <button className="utility-button" type="button" onClick={() => navigateTo("overview")} aria-label="Go to overview">⌂</button>
          <button className="utility-button" type="button" onClick={() => navigateTo("performance")} aria-label="Go to performance">◫</button>
          <button className="utility-button" type="button" onClick={() => navigateTo("prime-grid")} aria-label="Go to prime grid">▦</button>
          <button className="utility-button" type="button" onClick={() => navigateTo("raw-results")} aria-label="Go to raw results">⌘</button>
        </div>
      </header>
      <aside className="context-sidebar" aria-label="Run context">
        <section className="context-section"><h2>Run Context</h2><div className="context-row"><span>Limit</span><strong>{limit.toLocaleString()}</strong></div><div className="context-row"><span>Algorithm</span><strong>{algorithm === "both" ? "Compare" : algorithm}</strong></div><div className="context-row"><span>Threads</span><strong>{algorithm === "serial" ? "-" : numThreads}</strong></div><div className="context-row"><span>Status</span><strong className={error ? "status-error" : loading ? "status-running" : response ? "status-complete" : ""}>{error ? "Error" : loading ? "Running" : response ? "Complete" : "Idle"}</strong></div></section>
        <section className="context-section"><h2>Latest Run</h2><div className="context-row"><span>Time</span><strong>{lastRun?.timestamp ?? "-"}</strong></div><div className="context-row"><span>Duration</span><strong>{lastRun ? `${lastRun.durationMs} ms` : "-"}</strong></div><div className="context-row"><span>Validation</span><strong className={validation === "Counts match" ? "status-complete" : validation === "Count mismatch" ? "status-error" : ""}>{validation}</strong></div><div className="context-row"><span>Fastest</span><strong>{fastest?.algorithm ?? "-"}</strong></div><div className="context-row"><span>Speedup</span><strong>{speedup === undefined ? "-" : `${speedup.toFixed(2)}x`}</strong></div></section>
        {system && <section className="context-section"><h2>System</h2>{system.cpu_count && <div className="context-row"><span>CPU Cores</span><strong>{system.cpu_count}</strong></div>}{system.architecture && <div className="context-row"><span>Architecture</span><strong>{system.architecture}</strong></div>}<div className="context-row"><span>OpenMP</span><strong className={system.openmp_available ? "status-complete" : "status-error"}>{system.openmp_available ? "Available" : "Unavailable"}</strong></div>{system.compiler && <div className="context-row"><span>Compiler</span><strong title={system.compiler}>{system.compiler}</strong></div>}</section>}
        <section className="context-section context-history"><h2>Recent Runs</h2>{history.length === 0 ? <p>No completed runs yet.</p> : history.map((entry, index) => <button type="button" className="context-history-row" key={`${entry.timestamp}-${index}`} onClick={() => { setResponse(entry.response); setLimit(entry.response.parameters.limit); setAlgorithm(entry.response.parameters.algorithm); setNumThreads(entry.response.parameters.num_threads); setLastRun(entry); }}><span>{entry.timestamp}</span><span>{entry.response.parameters.limit.toLocaleString()} / {entry.response.parameters.algorithm}</span></button>)}</section>
        <section className="context-section benchmark-notes"><h2>Benchmark Notes</h2><p>Timings include process execution.</p><p>Small inputs may make serial faster.</p></section>
      </aside>
    <main className="dashboard" id="overview">
      <div className="dashboard-shell">
      <header className="page-header"><h1>Sieve of Eratosthenes</h1><p>Compare serial and OpenMP performance for prime number generation</p></header>

      <SieveControls onRun={runSieve} loading={loading} limit={limit} algorithm={algorithm} numThreads={numThreads} onLimitChange={setLimit} onAlgorithmChange={setAlgorithm} onNumThreadsChange={setNumThreads} />

      {error && (
          <div className="error-card">
          {error}
        </div>
      )}

      {response && (
        <>
          <SummaryMetrics response={response} />
          <div className="metrics" id="performance">
            <PerformanceChart results={response.results} />
            <SpeedupChart results={response.results} />
          </div>

          <div className="lower-grid">
            <div id="prime-grid">{response.results.some((r) => r.primes.length > 0) && <PrimeGrid results={response.results} />}</div>
            <section className="raw-card" id="raw-results">
              <div className="section-heading"><div className="title-with-icon"><span className="section-icon" aria-hidden="true">⌘</span><h3 className="raw-title">Raw Results</h3></div><button className="copy-button" onClick={copyResults} type="button"><span aria-hidden="true">⧉</span>{copied ? "Copied" : "Copy JSON"}</button></div>
              <JsonViewer value={response} />
            </section>
          </div>
        </>
      )}
      </div>
    </main>
    </>
  );
}
