import React, { useEffect, useMemo, useState } from "react";
import { Play, Pause, RotateCcw, ArrowRight, ShieldCheck, Lock, Unlock, StepForward, Radio } from "lucide-react";
import { generateSieveSimulation } from "../utils/sieveSimulation";
import { generateMpiSimulation, MpiStage } from "../utils/mpiSimulation";
import { KeyGenResult, EncryptionResult, DecryptionResult } from "../utils/rsaMath";

interface VisualisationViewProps {
  keys: KeyGenResult | null;
  encryptionResult: EncryptionResult | null;
  decryptionResult: DecryptionResult | null;
}

export const VisualisationView: React.FC<VisualisationViewProps> = ({
  keys,
  encryptionResult,
  decryptionResult,
}) => {
  const [maxGrid] = useState(30);
  const [simState] = useState(() => generateSieveSimulation(maxGrid));
  const [activeStep, setActiveStep] = useState(0);
  const [mpiLimit, setMpiLimit] = useState(30);
  const [processCount, setProcessCount] = useState(4);
  const [mpiStepIndex, setMpiStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(700);
  const mpiSimulation = useMemo(() => generateMpiSimulation(mpiLimit, processCount), [mpiLimit, processCount]);
  const mpiStep = mpiSimulation.steps[mpiStepIndex] || mpiSimulation.steps[0];

  useEffect(() => {
    setMpiStepIndex(0);
    setRunning(false);
  }, [mpiLimit, processCount]);

  useEffect(() => {
    if (!running) return undefined;
    const timer = window.setTimeout(() => {
      setMpiStepIndex((index) => {
        if (index >= mpiSimulation.steps.length - 1) {
          setRunning(false);
          return index;
        }
        return index + 1;
      });
    }, speed);
    return () => window.clearTimeout(timer);
  }, [running, speed, mpiSimulation.steps.length, mpiStepIndex]);

  const stageTitle: Record<MpiStage, string> = {
    unprocessed: "Unprocessed candidates",
    "base-generation": "Base-prime generation",
    broadcast: "MPI_Bcast",
    marking: "Parallel marking",
    "local-count": "Local counting",
    reduce: "MPI_Reduce",
    complete: "Complete",
  };

  const resetMpi = () => {
    setRunning(false);
    setMpiStepIndex(0);
  };

  const startMpi = () => {
    if (mpiStepIndex >= mpiSimulation.steps.length - 1) setMpiStepIndex(0);
    setRunning(true);
  };

  const nextMpiStep = () => {
    setRunning(false);
    setMpiStepIndex((index) => Math.min(mpiSimulation.steps.length - 1, index + 1));
  };

  const step = simState.steps[activeStep] || simState.steps[0];

  return (
    <div className="view-container visualisation-view">
      <div className="view-header">
        <h2 className="view-title">Interactive Visualizations</h2>
        <p className="view-subtitle">
          Explore the mechanics of prime number sieving and asymmetric RSA encryption step-by-step.
        </p>
      </div>

      {/* Sieve Interactive Grid */}
      <div className="vis-card">
        <div className="vis-card-header">
          <div>
            <h3 className="vis-card-title">1. Sieve of Eratosthenes Elimination Simulator</h3>
            <p className="vis-card-desc">
              Watch how candidate numbers are filtered as multiples of primes are eliminated.
            </p>
          </div>
          <div className="vis-controls">
            <button
              type="button"
              className="btn-sm btn-outline"
              onClick={() => setActiveStep(0)}
              disabled={activeStep === 0}
            >
              <RotateCcw size={14} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              className="btn-sm btn-primary"
              onClick={() => setActiveStep((prev) => Math.min(simState.steps.length - 1, prev + 1))}
              disabled={activeStep === simState.steps.length - 1}
            >
              <Play size={14} />
              <span>Next Step ({activeStep + 1}/{simState.steps.length})</span>
            </button>
          </div>
        </div>

        <div className="vis-description-banner">
          <strong>Step {activeStep + 1}:</strong> {step.description}
        </div>

        <div className="vis-grid-container">
          {step.grid.map((item) => {
            let cls = "vis-cell vis-cell-prime";
            if (!item.isPrime) {
              cls = "vis-cell vis-cell-composite";
            }
            if (item.num === step.currentPrime) {
              cls = "vis-cell vis-cell-active-prime";
            }
            if (item.isCurrentMultiple) {
              cls = "vis-cell vis-cell-marked-multiple";
            }

            return (
              <div key={item.num} className={cls}>
                <span className="vis-cell-num">{item.num}</span>
                <span className="vis-cell-status">
                  {item.isPrime ? "Prime" : `× ${item.isMultipleOf || ""}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="vis-card mpi-visual-card">
        <div className="vis-card-header">
          <div>
            <h3 className="vis-card-title"><Radio size={18} /> Module III: MPI Sieve Timeline</h3>
            <p className="vis-card-desc">
              A local replay of the MPI algorithm. It mirrors the C++ partitioning and JSON contract; it does not connect to live MPI ranks.
            </p>
          </div>
          <div className="mpi-inputs" aria-label="MPI simulation parameters">
            <label>N <input type="number" min={2} max={100} value={mpiLimit} onChange={(event) => setMpiLimit(Math.min(100, Math.max(2, Number(event.target.value) || 2)))} /></label>
            <label>Processes <input type="number" min={1} max={16} value={processCount} onChange={(event) => setProcessCount(Math.min(16, Math.max(1, Number(event.target.value) || 1)))} /></label>
          </div>
        </div>

        <div className="mpi-stage-banner">
          <div>
            <span className="mpi-kicker">Stage {mpiStepIndex + 1} / {mpiSimulation.steps.length}</span>
            <strong>{stageTitle[mpiStep.stage]}</strong>
            <p>{mpiStep.description}</p>
          </div>
          <div className="mpi-step-controls">
            {!running ? (
              <button type="button" className="btn-sm btn-primary" onClick={startMpi}><Play size={14} /> Start</button>
            ) : (
              <button type="button" className="btn-sm btn-primary" onClick={() => setRunning(false)}><Pause size={14} /> Pause</button>
            )}
            <button type="button" className="btn-sm btn-outline" onClick={() => setRunning(true)} disabled={running || mpiStepIndex === mpiSimulation.steps.length - 1}><Play size={14} /> Resume</button>
            <button type="button" className="btn-sm btn-outline" onClick={resetMpi}><RotateCcw size={14} /> Reset</button>
            <button type="button" className="btn-sm btn-outline" onClick={nextMpiStep} disabled={mpiStepIndex === mpiSimulation.steps.length - 1}><StepForward size={14} /> Next Step</button>
            <label className="mpi-speed">Speed
              <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                <option value={1100}>Slow</option>
                <option value={700}>Normal</option>
                <option value={300}>Fast</option>
              </select>
            </label>
          </div>
        </div>

        <div className="mpi-rank-grid">
          {mpiStep.ranks.map((rank) => (
            <div key={rank.rank} className={`mpi-rank-card ${mpiStep.activeRank === rank.rank ? "active" : ""}`}>
              <div className="mpi-rank-heading"><strong>Rank {rank.rank}</strong><span className={`mpi-stage-tag stage-${rank.stage}`}>{stageTitle[rank.stage]}</span></div>
              <span>Range {rank.workload ? `${rank.low}-${rank.high}` : "empty"}</span>
              <span>Workload {rank.workload}</span>
              <span>Local primes {rank.localPrimeCount || (mpiStep.stage === "local-count" || mpiStep.stage === "reduce" || mpiStep.stage === "complete" ? 0 : "-")}</span>
            </div>
          ))}
        </div>

        <div className="mpi-grid-legend">
          {(["unprocessed", "processing", "prime", "composite"] as const).map((state) => <span key={state}><i className={`mpi-swatch swatch-${state}`} />{state}</span>)}
        </div>
        <div className="mpi-number-grid">
          {mpiStep.cells.map((cell) => (
            <div key={cell.num} className={`mpi-number-cell state-${cell.state} rank-${cell.rank}`} title={`Rank ${cell.rank}${cell.factor ? `, multiple of ${cell.factor}` : ""}`}>
              <strong>{cell.num}</strong><small>R{cell.rank}</small>
            </div>
          ))}
        </div>
      </div>

      {/* End-to-End RSA Data Flow Animation Card */}
      <div className="vis-card">
        <div className="vis-card-header">
          <div>
            <h3 className="vis-card-title">2. End-to-End RSA Cryptographic Pipeline</h3>
            <p className="vis-card-desc">
              How data transforms from plaintext to ciphertext blocks and back to original text.
            </p>
          </div>
        </div>

        <div className="rsa-pipeline-visual">
          {/* Node 1: Key Generation */}
          <div className="vis-pipeline-node">
            <div className="node-icon-header bg-purple-100 text-purple-700">
              <ShieldCheck size={24} />
            </div>
            <h4>Key Generation</h4>
            <div className="node-data-pill">
              <span>Public: (e, n) = ({keys?.e.toString() || "65537"}, {keys?.n.toString() || "..."})</span>
              <span>Private: (d, n) = ({keys?.d.toString() || "..."}, {keys?.n.toString() || "..."})</span>
            </div>
          </div>

          <div className="vis-pipe-connector">
            <ArrowRight size={20} className="text-slate-400" />
            <span className="pipe-label">Public Key (e, n)</span>
          </div>

          {/* Node 2: Encryption */}
          <div className="vis-pipeline-node">
            <div className="node-icon-header bg-emerald-100 text-emerald-700">
              <Lock size={24} />
            </div>
            <h4>Encryption (C = Mᵉ mod n)</h4>
            <div className="node-data-pill">
              <span>Plain: "{encryptionResult?.plaintext || "Hello IIIT Kottayam"}"</span>
              <span className="truncate max-w-[180px]">
                Cipher: {encryptionResult?.ciphertextFormatted.slice(0, 20) || "..."}...
              </span>
            </div>
          </div>

          <div className="vis-pipe-connector">
            <ArrowRight size={20} className="text-slate-400" />
            <span className="pipe-label">Private Key (d, n)</span>
          </div>

          {/* Node 3: Decryption */}
          <div className="vis-pipeline-node">
            <div className="node-icon-header bg-orange-100 text-orange-700">
              <Unlock size={24} />
            </div>
            <h4>Decryption (M = Cᵈ mod n)</h4>
            <div className="node-data-pill">
              <span>Recovered: "{decryptionResult?.decryptedText || "Hello IIIT Kottayam"}"</span>
              <span className="text-emerald-600 font-semibold">
                {decryptionResult?.isMatch ? "✓ Exact Match" : "Ready"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
