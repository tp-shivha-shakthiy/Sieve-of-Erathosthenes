import { useState } from "react";
import type { SieveResult } from "../App";

interface Props {
  results: SieveResult[];
}

export default function PrimeGrid({ results }: Props) {
  const [selectedAlgorithm, setSelectedAlgorithm] = useState(0);
  const result = results[selectedAlgorithm];

  if (!result || result.primes.length === 0) return null;

  return (
    <div style={{ marginTop: 20, padding: 16, background: "white", borderRadius: 8, border: "1px solid #e0e0e0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>
          Prime Grid — {result.algorithm === "serial" ? "Serial" : `OpenMP (${result.num_threads}t)`} ({result.primes.length} primes)
        </h3>
        {results.length > 1 && (
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(Number(e.target.value))}
            style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #ccc" }}
          >
            {results.map((r, i) => (
              <option key={i} value={i}>
                {r.algorithm === "serial" ? "Serial" : `OpenMP (${r.num_threads}t)`}
              </option>
            ))}
          </select>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          maxHeight: 300,
          overflow: "auto",
          padding: 8,
          background: "#fafafa",
          borderRadius: 4,
        }}
      >
        {result.primes.slice(0, 5000).map((p) => (
          <span
            key={p}
            style={{
              display: "inline-block",
              padding: "2px 6px",
              borderRadius: 3,
              background: "#3366cc",
              color: "white",
              fontSize: 11,
              lineHeight: "16px",
            }}
          >
            {p}
          </span>
        ))}
        {result.primes.length > 5000 && (
          <span style={{ fontSize: 12, color: "#888", padding: "2px 6px" }}>
            ...and {result.primes.length - 5000} more
          </span>
        )}
      </div>
    </div>
  );
}
