import { useState } from "react";
import SieveControls from "./components/SieveControls";
import PrimeGrid from "./components/PrimeGrid";
import PerformanceChart from "./components/PerformanceChart";
import SpeedupChart from "./components/SpeedupChart";

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

export default function App() {
  const [response, setResponse] = useState<SieveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSieve = async (
    limit: number,
    algorithm: string,
    numThreads: number
  ) => {
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
      setResponse(await res.json());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Sieve of Eratosthenes</h1>
      <p style={{ color: "#666", marginTop: 0 }}>Serial vs OpenMP Benchmark</p>

      <SieveControls onRun={runSieve} loading={loading} />

      {error && (
        <div style={{ padding: 12, background: "#fee", border: "1px solid #c00", borderRadius: 6, marginTop: 16, color: "#c00" }}>
          {error}
        </div>
      )}

      {response && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 24 }}>
            <PerformanceChart results={response.results} />
            <SpeedupChart results={response.results} />
          </div>

          {response.results.some((r) => r.primes.length > 0) && (
            <PrimeGrid results={response.results} />
          )}

          <div style={{ marginTop: 20, padding: 16, background: "#f5f5f5", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 8px" }}>Raw Results</h3>
            <pre style={{ margin: 0, fontSize: 13, overflow: "auto" }}>
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}
