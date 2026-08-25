import { useState } from "react";

interface Props {
  onRun: (limit: number, algorithm: string, numThreads: number) => void;
  loading: boolean;
}

const PRESETS = [100, 1000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];

export default function SieveControls({ onRun, loading }: Props) {
  const [limit, setLimit] = useState(1000);
  const [algorithm, setAlgorithm] = useState("both");
  const [numThreads, setNumThreads] = useState(4);

  return (
    <div style={{ padding: 16, background: "#f0f4ff", borderRadius: 8, display: "flex", gap: 20, alignItems: "end", flexWrap: "wrap" }}>
      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Limit (N)</span>
        <input
          type="number"
          value={limit}
          min={2}
          max={100_000_000}
          onChange={(e) => setLimit(Number(e.target.value))}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", width: 140 }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Presets</span>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setLimit(p)}
              style={{
                padding: "4px 8px",
                borderRadius: 4,
                border: limit === p ? "2px solid #3366cc" : "1px solid #ccc",
                background: limit === p ? "#ddeeff" : "white",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              {p >= 1_000_000 ? `${p / 1_000_000}M` : p >= 1000 ? `${p / 1000}K` : p}
            </button>
          ))}
        </div>
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Algorithm</span>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc" }}
        >
          <option value="both">Both (Compare)</option>
          <option value="serial">Serial Only</option>
          <option value="openmp">OpenMP Only</option>
        </select>
      </label>

      {(algorithm === "openmp" || algorithm === "both") && (
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Threads</span>
          <input
            type="number"
            value={numThreads}
            min={1}
            max={64}
            onChange={(e) => setNumThreads(Number(e.target.value))}
            style={{ padding: "6px 10px", borderRadius: 4, border: "1px solid #ccc", width: 80 }}
          />
        </label>
      )}

      <button
        onClick={() => onRun(limit, algorithm, numThreads)}
        disabled={loading}
        style={{
          padding: "8px 24px",
          borderRadius: 4,
          border: "none",
          background: loading ? "#999" : "#3366cc",
          color: "white",
          fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer",
          fontSize: 14,
        }}
      >
        {loading ? "Running..." : "Run Sieve"}
      </button>
    </div>
  );
}
