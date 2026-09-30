import React, { useState } from "react";
import { Play, RotateCcw, ArrowRight, ShieldCheck, Lock, Unlock, CheckCircle } from "lucide-react";
import { generateSieveSimulation } from "../utils/sieveSimulation";
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
