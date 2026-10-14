import React, { useMemo, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  Gauge,
  Radio,
  Network,
  ShieldCheck,
  Lock,
  Unlock,
  ArrowRight,
} from "lucide-react";
import { generateSieveVizSteps } from "../utils/sieveSimulation";
import { generateMpiSimulation, MpiCell, MpiRange, MpiStage } from "../utils/mpiSimulation";
import { StepPlayer, useStepPlayer } from "../utils/useStepPlayer";
import { KeyGenResult, EncryptionResult, DecryptionResult } from "../utils/rsaMath";

interface VisualisationViewProps {
  keys: KeyGenResult | null;
  encryptionResult: EncryptionResult | null;
  decryptionResult: DecryptionResult | null;
}

const SPEED_OPTIONS = [
  { label: "0.5×", ms: 1400 },
  { label: "1×", ms: 800 },
  { label: "2×", ms: 380 },
  { label: "4×", ms: 160 },
];

const MPI_STAGE_SEQUENCE: MpiStage[] = [
  "unprocessed",
  "base-generation",
  "broadcast",
  "marking",
  "local-count",
  "reduce",
  "complete",
];

const MPI_STAGE_LABEL: Record<MpiStage, string> = {
  unprocessed: "Distribute",
  "base-generation": "Base primes",
  broadcast: "Broadcast",
  marking: "Mark multiples",
  "local-count": "Local count",
  reduce: "Reduce",
  complete: "Complete",
};

interface LaneStatus {
  label: string;
  tone: string;
}

function laneStatus(rank: MpiRange, stepStage: MpiStage): LaneStatus {
  switch (stepStage) {
    case "base-generation":
      return rank.rank === 0 ? { label: "generating", tone: "tone-work" } : { label: "waiting", tone: "tone-idle" };
    case "broadcast":
      return rank.rank === 0 ? { label: "source", tone: "tone-source" } : { label: "receiving", tone: "tone-recv" };
    case "marking":
      return { label: "marking", tone: "tone-work" };
    case "local-count":
      return { label: "counting", tone: "tone-work" };
    case "reduce":
      return rank.rank === 0 ? { label: "summing", tone: "tone-recv" } : { label: "sending", tone: "tone-source" };
    case "complete":
      return { label: "done", tone: "tone-done" };
    default:
      return { label: "idle", tone: "tone-idle" };
  }
}

const TransportControls: React.FC<{ player: StepPlayer }> = ({ player }) => {
  const showResume = !player.playing && !player.atStart && !player.atEnd;
  const label = player.playing ? "Pause" : player.atEnd ? "Restart" : showResume ? "Resume" : "Start";

  return (
    <div className="transport" role="group" aria-label="Animation controls">
      <button type="button" className="tbtn" onClick={player.reset} title="Reset to the first step">
        <RotateCcw size={15} />
      </button>
      <button type="button" className="tbtn" onClick={player.prev} disabled={player.atStart} title="Previous step">
        <StepBack size={15} />
      </button>
      <button type="button" className={`tbtn primary ${player.playing ? "is-playing" : ""}`} onClick={player.toggle} title="Start, pause or resume">
        {player.playing ? <Pause size={15} /> : <Play size={15} />}
        <span>{label}</span>
      </button>
      <button type="button" className="tbtn" onClick={player.next} disabled={player.atEnd} title="Next step">
        <StepForward size={15} />
      </button>
      <div className="speed-group" aria-label="Animation speed">
        <Gauge size={14} className="speed-icon" />
        {SPEED_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            className={`speed-btn ${player.speed === option.ms ? "active" : ""}`}
            onClick={() => player.setSpeed(option.ms)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div className="progress-wrap">
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.max(2, value)}%` }} />
    </div>
    <span className="progress-label">{label}</span>
  </div>
);

const MpiCellTile: React.FC<{ cell: MpiCell }> = ({ cell }) => (
  <div
    className={`mpi-cell state-${cell.state} ${cell.justMarked ? "just-marked" : ""}`}
    title={`${cell.num} · Rank ${cell.rank}${cell.factor ? ` · multiple of ${cell.factor}` : ""}`}
  >
    <span className="mpi-cell-num">{cell.num}</span>
  </div>
);

export const VisualisationView: React.FC<VisualisationViewProps> = ({
  keys,
  encryptionResult,
  decryptionResult,
}) => {
  const sieveSim = useMemo(() => generateSieveVizSteps(30), []);
  const sievePlayer = useStepPlayer(sieveSim.steps.length, 900, "sieve");
  const sieveStep = sieveSim.steps[sievePlayer.index] ?? sieveSim.steps[0];

  const [mpiLimit, setMpiLimit] = useState(30);
  const [processCount, setProcessCount] = useState(4);
  const mpiSim = useMemo(() => generateMpiSimulation(mpiLimit, processCount), [mpiLimit, processCount]);
  const mpiPlayer = useStepPlayer(mpiSim.steps.length, 800, `${mpiLimit}-${processCount}`);
  const mpiStep = mpiSim.steps[mpiPlayer.index] ?? mpiSim.steps[0];

  const sieveRemaining = sieveStep.cells.filter((c) => c.state === "unprocessed" || c.state === "active").length;
  const sievePrimesFound = sieveStep.phase === "complete" ? sieveStep.primeCount : null;

  const stageIndex = MPI_STAGE_SEQUENCE.indexOf(mpiStep.stage);
  const commMode = mpiStep.stage === "broadcast" ? "broadcast" : mpiStep.stage === "reduce" ? "reduce" : "none";
  const showLocalCounts = ["local-count", "reduce", "complete"].includes(mpiStep.stage);

  return (
    <div className="view-container visualisation-view viz-console">
      <header className="console-head">
        <div>
          <span className="console-kicker">High-Performance Computing · Interactive Lab</span>
          <h2 className="console-title">Sieve &amp; MPI Visualizer</h2>
          <p className="console-sub">
            Follow the serial sieve, then watch how MPI partitions the same candidates across ranks and
            combines the counts.
          </p>
        </div>
        <div className="console-legend-pills">
          <span className="pill pill-accent">Serial</span>
          <span className="pill pill-prime">Prime</span>
          <span className="pill pill-composite">Composite</span>
        </div>
      </header>

      {/* ---------------- 1. Sieve of Eratosthenes ---------------- */}
      <section className="console-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">1</span>
            <div>
              <h3>Sieve of Eratosthenes</h3>
              <p>Eliminate multiples of each prime candidate up to √N.</p>
            </div>
          </div>
          <TransportControls player={sievePlayer} />
        </div>

        <ProgressBar
          value={sievePlayer.progress}
          label={`Step ${sievePlayer.index + 1} / ${sieveSim.steps.length}`}
        />

        <div className={`console-banner ${sieveStep.phase === "complete" ? "banner-done" : ""}`}>
          <span className="banner-tag">
            {sieveStep.phase === "init"
              ? "Initialise"
              : sieveStep.phase === "complete"
              ? "Done"
              : `Prime ${sieveStep.currentPrime}`}
          </span>
          <span>{sieveStep.description}</span>
        </div>

        <div className="sieve-layout">
          <div
            className="sieve-grid"
            style={{ gridTemplateColumns: `repeat(${sieveStep.columns}, minmax(0, 1fr))` }}
          >
            {sieveStep.cells.map((cell) => (
              <div
                key={cell.num}
                className={`sieve-cell s-${cell.state} ${cell.justMarked ? "just-marked" : ""}`}
                title={
                  cell.factor
                    ? `${cell.num} eliminated: multiple of ${cell.factor}`
                    : cell.state === "prime"
                    ? `${cell.num} is prime`
                    : `${cell.num} is still a candidate`
                }
              >
                <span className="sieve-num">{cell.num}</span>
                <span className="sieve-sub">
                  {cell.state === "active"
                    ? "prime"
                    : cell.justMarked
                    ? `×${cell.factor}`
                    : cell.state === "prime"
                    ? "✓"
                    : ""}
                </span>
              </div>
            ))}
          </div>

          <aside className="sieve-stats">
            <div className="stat-row">
              <span>Active prime</span>
              <strong>{sieveStep.currentPrime || "—"}</strong>
            </div>
            <div className="stat-row">
              <span>Marked this step</span>
              <strong>{sieveStep.newMarked.length}</strong>
            </div>
            <div className="stat-row">
              <span>Eliminated</span>
              <strong className="stat-composite">{sieveStep.eliminatedCount}</strong>
            </div>
            <div className="stat-row">
              <span>Candidates left</span>
              <strong>{sieveRemaining}</strong>
            </div>
            <div className="stat-row">
              <span>Primes found</span>
              <strong className="stat-prime">{sievePrimesFound ?? "—"}</strong>
            </div>
            <div className="sieve-legend">
              <span><i className="sw sw-unprocessed" />unprocessed</span>
              <span><i className="sw sw-active" />active prime</span>
              <span><i className="sw sw-prime" />prime</span>
              <span><i className="sw sw-composite" />composite</span>
            </div>
          </aside>
        </div>
      </section>

      {/* ---------------- 2. MPI Distributed Sieve ---------------- */}
      <section className="console-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">2</span>
            <div>
              <h3><Radio size={17} /> MPI Distributed Sieve</h3>
              <p>Module III · rank-owned ranges, broadcast, parallel marking and reduction.</p>
            </div>
          </div>
          <div className="mpi-params">
            <label className="param-field">
              N
              <input
                type="number"
                min={2}
                max={120}
                value={mpiLimit}
                onChange={(event) => setMpiLimit(Math.min(120, Math.max(2, Number(event.target.value) || 2)))}
              />
            </label>
            <label className="param-field">
              Processes
              <input
                type="number"
                min={1}
                max={8}
                value={processCount}
                onChange={(event) => setProcessCount(Math.min(8, Math.max(1, Number(event.target.value) || 1)))}
              />
            </label>
          </div>
        </div>

        <div className="mpi-controls-row">
          <TransportControls player={mpiPlayer} />
          <ProgressBar
            value={mpiPlayer.progress}
            label={`Stage ${mpiPlayer.index + 1} / ${mpiSim.steps.length}`}
          />
        </div>

        <div className="mpi-pipeline" aria-label="MPI stages">
          {MPI_STAGE_SEQUENCE.map((stage, index) => (
            <React.Fragment key={stage}>
              <div
                className={`pipeline-node ${stage === mpiStep.stage ? "active" : ""} ${index < stageIndex ? "done" : ""}`}
              >
                <span className="pipeline-dot" />
                <span className="pipeline-text">{MPI_STAGE_LABEL[stage]}</span>
              </div>
              {index < MPI_STAGE_SEQUENCE.length - 1 && <span className="pipeline-link" />}
            </React.Fragment>
          ))}
        </div>

        <div className={`console-banner ${mpiStep.stage === "complete" ? "banner-done" : ""}`}>
          <span className="banner-tag">{MPI_STAGE_LABEL[mpiStep.stage]}</span>
          <span>{mpiStep.description}</span>
        </div>

        <div className="mpi-ownership" aria-hidden="true">
          {mpiStep.ranks.map((rank) => (
            <span
              key={rank.rank}
              className={`own-seg rank-${rank.rank}`}
              style={{ flexGrow: rank.workload || 0.0001 }}
              title={`Rank ${rank.rank}: ${rank.workload} candidates`}
            >
              {rank.workload > 0 && <i>R{rank.rank}</i>}
            </span>
          ))}
        </div>

        {commMode !== "none" && (
          <div className={`mpi-comm comm-${commMode}`}>
            <span className="comm-caption">
              <Network size={14} />
              {commMode === "broadcast" ? "MPI_Bcast" : "MPI_Reduce"} · base prime {mpiStep.currentPrime ?? "—"}
            </span>
            <div className="comm-row">
              {commMode === "broadcast" ? (
                <>
                  <span className="comm-node source">R0</span>
                  <ArrowRight className="comm-arrow" size={16} />
                  <div className="comm-targets">
                    {mpiStep.ranks.slice(1).map((rank) => (
                      <span key={rank.rank} className="comm-node target">R{rank.rank}</span>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="comm-targets">
                    {mpiStep.ranks.slice(1).map((rank) => (
                      <span key={rank.rank} className="comm-node target">R{rank.rank}</span>
                    ))}
                  </div>
                  <ArrowRight className="comm-arrow reverse" size={16} />
                  <span className="comm-node source">R0</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mpi-lanes">
          {mpiStep.ranks.map((rank) => {
            const rankCells = mpiStep.cells.filter((cell) => cell.rank === rank.rank);
            const status = laneStatus(rank, mpiStep.stage);
            return (
              <div key={rank.rank} className={`mpi-lane rank-${rank.rank} ${status.tone}`}>
                <div className="lane-head">
                  <span className="lane-chip">R{rank.rank}</span>
                  <span className="lane-range">{rank.workload ? `${rank.low}–${rank.high}` : "no candidates"}</span>
                  <span className="lane-stat">workload <b>{rank.workload}</b></span>
                  <span className="lane-stat">
                    primes <b>{showLocalCounts ? rank.localPrimeCount : rank.workload ? "…" : 0}</b>
                  </span>
                  <span className={`lane-status ${status.tone}`}>{status.label}</span>
                </div>
                <div className={`lane-cells ${rank.workload === 0 ? "is-empty" : ""}`}>
                  {rankCells.length > 0 ? (
                    rankCells.map((cell) => <MpiCellTile key={cell.num} cell={cell} />)
                  ) : (
                    <span className="lane-empty">empty range — contributes 0</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mpi-summary">
          <div className="summary-item">
            <span>Ranks</span>
            <strong>{processCount}</strong>
          </div>
          <div className="summary-item">
            <span>Base primes ≤ √N</span>
            <strong>{mpiStep.basePrimes.join(", ") || "none"}</strong>
          </div>
          <div className="summary-item">
            <span>Candidate span</span>
            <strong>2 – {mpiLimit}</strong>
          </div>
          <div className="summary-item highlight">
            <span>Reduced prime total</span>
            <strong>{showLocalCounts ? mpiStep.totalPrimeCount : "—"}</strong>
          </div>
        </div>

        <div className="mpi-legend">
          {(["unprocessed", "processing", "prime", "composite"] as const).map((state) => (
            <span key={state}><i className={`sw sw-${state}`} />{state === "processing" ? "active prime" : state}</span>
          ))}
          <span className="rank-key"><i className="sw rank-0" />R0</span>
          <span className="rank-key"><i className="sw rank-1" />R1</span>
          <span className="rank-key"><i className="sw rank-2" />R2</span>
          <span className="rank-key"><i className="sw rank-3" />R3</span>
        </div>
      </section>

      {/* ---------------- 3. RSA Data Flow ---------------- */}
      <section className="console-card">
        <div className="console-card-head">
          <div className="console-card-title">
            <span className="section-index">3</span>
            <div>
              <h3>End-to-End RSA Pipeline</h3>
              <p>How the generated primes flow through key generation, encryption and decryption.</p>
            </div>
          </div>
        </div>

        <div className="rsa-pipeline-visual">
          <div className="vis-pipeline-node">
            <div className="node-icon-header node-purple">
              <ShieldCheck size={22} />
            </div>
            <h4>Key Generation</h4>
            <div className="node-data-pill">
              <span>public (e, n) = ({keys?.e.toString() || "…"}, {keys?.n.toString() || "…"})</span>
              <span>private (d, n) = ({keys?.d.toString() || "…"}, {keys?.n.toString() || "…"})</span>
            </div>
          </div>

          <div className="vis-pipe-connector">
            <ArrowRight size={20} />
            <span className="pipe-label">public key (e, n)</span>
          </div>

          <div className="vis-pipeline-node">
            <div className="node-icon-header node-green">
              <Lock size={22} />
            </div>
            <h4>Encryption C = Mᵉ mod n</h4>
            <div className="node-data-pill">
              <span>plain: "{encryptionResult?.plaintext || "—"}"</span>
              <span className="truncate">
                cipher: {encryptionResult?.ciphertextFormatted.slice(0, 18) || "—"}{encryptionResult ? "…" : ""}
              </span>
            </div>
          </div>

          <div className="vis-pipe-connector">
            <ArrowRight size={20} />
            <span className="pipe-label">private key (d, n)</span>
          </div>

          <div className="vis-pipeline-node">
            <div className="node-icon-header node-orange">
              <Unlock size={22} />
            </div>
            <h4>Decryption M = Cᵈ mod n</h4>
            <div className="node-data-pill">
              <span>recovered: "{decryptionResult?.decryptedText || "—"}"</span>
              <span className={decryptionResult?.isMatch ? "ok" : "muted"}>
                {decryptionResult ? (decryptionResult.isMatch ? "✓ exact match" : "mismatch") : "run the RSA steps to populate"}
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
