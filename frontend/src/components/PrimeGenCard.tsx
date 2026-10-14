import React, { useState } from "react";
import { Play, CheckCircle2, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { SieveResponse } from "../App";
import { generateSieveSimulation, SieveStep } from "../utils/sieveSimulation";

interface PrimeGenCardProps {
  limit: number;
  algorithm: string;
  numThreads: number;
  loading: boolean;
  response: SieveResponse | null;
  onLimitChange: (limit: number) => void;
  onAlgorithmChange: (algo: string) => void;
  onNumThreadsChange: (threads: number) => void;
  onRunSieve: () => void;
}

export const PrimeGenCard: React.FC<PrimeGenCardProps> = ({
  limit,
  algorithm,
  numThreads,
  loading,
  response,
  onLimitChange,
  onAlgorithmChange,
  onNumThreadsChange,
  onRunSieve,
}) => {
  const [showPrimeBrowser, setShowPrimeBrowser] = useState(false);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [simulation] = useState(() => generateSieveSimulation(25));

  const currentSimStep: SieveStep = simulation.steps[simStepIndex] || simulation.steps[0];

  const serialResult = response?.results.find((r) => r.algorithm === "serial");
  const openmpResult = response?.results.find((r) => r.algorithm === "openmp");
  const primeCount = serialResult?.prime_count ?? openmpResult?.prime_count ?? null;
  const speedup = openmpResult?.speedup;

  const formatTime = (ms?: number) => {
    if (ms === undefined || ms === null) return "-";
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(3)} s`;
    }
    return `${ms.toFixed(2)} ms`;
  };

  return (
    <section className="stage-card stage-card-prime" id="prime-generation">
      <div className="stage-header">
        <div className="stage-badge badge-blue">1</div>
        <div className="stage-title-wrap">
          <h2 className="stage-title">Generate Prime Numbers</h2>
          <p className="stage-subtitle">
            RSA requires two large prime numbers. We use the Sieve of Eratosthenes
            (serial or parallel) to generate primes up to a chosen limit.
          </p>
        </div>
      </div>

      <div className="stage-grid-3">
        {/* Column 1: Controls */}
        <div className="card-panel panel-controls">
          <div className="form-group">
            <label htmlFor="upper-limit" className="field-label">
              Upper limit (N)
            </label>
            <input
              id="upper-limit"
              type="number"
              min={10}
              max={10000000}
              step={1000}
              className="text-input"
              value={limit}
              onChange={(e) => onLimitChange(Math.max(2, parseInt(e.target.value) || 2))}
            />
            <span className="field-hint">Generate all primes ≤ N</span>
          </div>

          <div className="form-group">
            <label htmlFor="algorithm-select" className="field-label">
              Algorithm
            </label>
            <select
              id="algorithm-select"
              className="select-input"
              value={algorithm}
              onChange={(e) => onAlgorithmChange(e.target.value)}
            >
              <option value="both">Both (Compare)</option>
              <option value="serial">Serial</option>
              <option value="openmp">OpenMP</option>
            </select>
          </div>

          <div className="form-group">
            <label className="field-label">
              Number of threads <span className="text-muted">(for OpenMP)</span>
            </label>
            <div className="thread-pill-group">
              {[1, 2, 4, 8].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`thread-pill-btn ${numThreads === t ? "active" : ""}`}
                  onClick={() => onNumThreadsChange(t)}
                  disabled={algorithm === "serial"}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            className="btn-primary btn-generate"
            onClick={onRunSieve}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Running Sieve...</span>
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" />
                <span>Generate Primes</span>
              </>
            )}
          </button>
        </div>

        {/* Column 2: Educational Sieve Explanation & Visual Strip */}
        <div className="card-panel panel-how-it-works">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">How Sieve of Eratosthenes works</h3>
          </div>

          <div className="sieve-steps-flow">
            <div className="sieve-step-item">
              <span className="step-num-bubble">1</span>
              <span className="step-text">Start with all numbers marked as prime</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="sieve-step-item">
              <span className="step-num-bubble">2</span>
              <span className="step-text">Mark multiples of 2, 3, 5, ... as non-prime</span>
            </div>
            <div className="step-arrow">→</div>
            <div className="sieve-step-item">
              <span className="step-num-bubble">3</span>
              <span className="step-text">Remaining numbers are primes</span>
            </div>
          </div>

          {/* Interactive candidate visual strip */}
          <div className="sieve-strip-container">
            <div className="sieve-strip-label">
              <span>Candidate numbers visualization (2..15+):</span>
              <span className="step-interactive-badge">
                Step {simStepIndex + 1} of {simulation.steps.length}
              </span>
            </div>
            <div className="sieve-number-strip">
              {currentSimStep.grid.slice(0, 14).map((item) => {
                let badgeClass = "num-pill-prime";
                if (!item.isPrime) {
                  badgeClass = "num-pill-composite";
                }
                if (item.num === currentSimStep.currentPrime) {
                  badgeClass = "num-pill-active-prime";
                }
                return (
                  <span
                    key={item.num}
                    className={`num-pill ${badgeClass}`}
                    title={
                      item.isPrime
                        ? `${item.num} is prime`
                        : `${item.num} is composite (multiple of ${item.isMultipleOf || "factor"})`
                    }
                  >
                    {item.num}
                  </span>
                );
              })}
              <span className="num-pill num-pill-ellipsis">...</span>
            </div>

            <div className="sieve-stepper-controls">
              <button
                type="button"
                className="step-btn"
                disabled={simStepIndex === 0}
                onClick={() => setSimStepIndex((prev) => Math.max(0, prev - 1))}
              >
                ◀ Prev Step
              </button>
              <span className="step-desc-inline">{currentSimStep.description}</span>
              <button
                type="button"
                className="step-btn"
                disabled={simStepIndex === simulation.steps.length - 1}
                onClick={() =>
                  setSimStepIndex((prev) =>
                    Math.min(simulation.steps.length - 1, prev + 1)
                  )
                }
              >
                Next Step ▶
              </button>
            </div>
          </div>
        </div>

        {/* Column 3: Results */}
        <div className="card-panel panel-results">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">Prime Generation Results</h3>
          </div>

          <div className="results-list">
            <div className="result-row">
              <span className="result-label">Total primes found</span>
              <strong className="result-value">
                {primeCount !== null ? primeCount.toLocaleString() : "-"}
              </strong>
            </div>

            <div className="result-row">
              <span className="result-label">Serial time</span>
              <strong className="result-value">
                {formatTime(serialResult?.execution_time_ms)}
              </strong>
            </div>

            <div className="result-row">
              <span className="result-label">
                Parallel time ({openmpResult?.actual_threads || numThreads} threads)
              </span>
              <strong className="result-value">
                {formatTime(openmpResult?.execution_time_ms)}
              </strong>
            </div>

            <div className="result-row">
              <span className="result-label">Speedup</span>
              <strong className="result-value speedup-highlight">
                {speedup !== undefined ? `${speedup.toFixed(2)} ×` : "-"}
              </strong>
            </div>
          </div>

          {response && (
            <div className="success-badge-pill">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span>Prime generation completed!</span>
            </div>
          )}

          {response && (
            <button
              type="button"
              className="prime-browser-toggle"
              onClick={() => setShowPrimeBrowser(!showPrimeBrowser)}
            >
              <span>View Primes List</span>
              {showPrimeBrowser ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Prime Browser */}
      {showPrimeBrowser && response && (
        <div className="prime-browser-drawer">
          <div className="prime-browser-header">
            <h4>Sample Generated Primes (showing largest and smallest candidates)</h4>
          </div>
          {response.results.some((r) => r.primes && r.primes.length > 0) ? (
            <div className="prime-sample-tags">
              {(
                response.results.find((r) => r.primes && r.primes.length > 0)?.primes || []
              )
                .slice(0, 100)
                .map((p) => (
                  <span key={p} className="prime-tag">
                    {p}
                  </span>
                ))}
              {((response.results.find((r) => r.primes)?.primes?.length || 0) > 100) && (
                <span className="prime-tag text-muted">
                  +{(response.results.find((r) => r.primes)?.primes?.length || 0) - 100} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-muted small">
              Primes array truncated for large limits (limit &gt; 100,000). Total count: {primeCount?.toLocaleString()}.
            </p>
          )}
        </div>
      )}
    </section>
  );
};
