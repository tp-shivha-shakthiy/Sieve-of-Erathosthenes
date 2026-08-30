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
    <div className="prime-card">
      <div className="section-heading">
        <div className="title-with-icon">
          <span className="section-icon" aria-hidden="true">▦</span>
          <h3 className="prime-title">Prime Grid - {result.primes.length.toLocaleString()} Primes Found</h3>
        </div>
        {results.length > 1 && (
          <select
            value={selectedAlgorithm}
            onChange={(e) => setSelectedAlgorithm(Number(e.target.value))}
            className="grid-select"
          >
            {results.map((r, i) => (
              <option key={i} value={i}>
                {r.algorithm === "serial" ? "Serial" : `OpenMP (${r.num_threads} threads)`}
              </option>
            ))}
          </select>
        )}
      </div>
      <div
        className="prime-list"
      >
        {result.primes.slice(0, 5000).map((p) => (
          <span
            key={p}
            className="prime-cell"
          >
            {p}
          </span>
        ))}
        {result.primes.length > 5000 && (
          <span className="more-primes">
            ...and {result.primes.length - 5000} more
          </span>
        )}
      </div>
    </div>
  );
}
