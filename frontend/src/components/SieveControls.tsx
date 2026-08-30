interface Props {
  onRun: (limit: number, algorithm: string, numThreads: number) => void;
  loading: boolean;
  limit: number;
  algorithm: string;
  numThreads: number;
  onLimitChange: (limit: number) => void;
  onAlgorithmChange: (algorithm: string) => void;
  onNumThreadsChange: (numThreads: number) => void;
}

const PRESETS = [100, 1000, 10_000, 100_000, 1_000_000, 10_000_000, 100_000_000];

export default function SieveControls({
  onRun,
  loading,
  limit,
  algorithm,
  numThreads,
  onLimitChange,
  onAlgorithmChange,
  onNumThreadsChange,
}: Props) {

  return (
    <div className="control-panel">
      <label className="control-field">
        <span className="control-label">Limit (N)</span>
        <input
          type="number"
          value={limit}
          min={2}
          max={100_000_000}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          className="control-input"
        />
      </label>

      <label className="control-field">
        <span className="control-label">Presets</span>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => onLimitChange(p)}
              className={`preset-button ${limit === p ? "active" : ""}`}
            >
              {p >= 1_000_000 ? `${p / 1_000_000}M` : p >= 1000 ? `${p / 1000}K` : p}
            </button>
          ))}
        </div>
      </label>

      <label className="control-field">
        <span className="control-label">Algorithm</span>
        <select
          value={algorithm}
          onChange={(e) => onAlgorithmChange(e.target.value)}
          className="control-select"
        >
          <option value="both">Both (Compare)</option>
          <option value="serial">Serial Only</option>
          <option value="openmp">OpenMP Only</option>
        </select>
      </label>

      {(algorithm === "openmp" || algorithm === "both") && (
        <label className="control-field">
          <span className="control-label">Threads</span>
          <input
            type="number"
            value={numThreads}
            min={1}
            max={64}
            onChange={(e) => onNumThreadsChange(Number(e.target.value))}
            className="control-input thread-input"
          />
        </label>
      )}

      <button
        onClick={() => onRun(limit, algorithm, numThreads)}
        disabled={loading}
        className="run-button"
      >
        {loading ? "Running..." : "Run Benchmark"} <span aria-hidden="true">&#9654;</span>
      </button>
    </div>
  );
}
