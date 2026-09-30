import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { KeyGenResult } from "../utils/rsaMath";

interface WorkflowSummaryCardProps {
  hasPrimes: boolean;
  keys: KeyGenResult | null;
  hasCiphertext: boolean;
  hasDecrypted: boolean;
  isMatch: boolean;
  onNavigateStage?: (stageId: string) => void;
}

export const WorkflowSummaryCard: React.FC<WorkflowSummaryCardProps> = ({
  hasPrimes,
  keys,
  hasCiphertext,
  hasDecrypted,
  isMatch,
  onNavigateStage,
}) => {
  return (
    <section className="stage-card stage-card-workflow" id="workflow-summary">
      <div className="stage-header">
        <div className="stage-badge badge-pink">5</div>
        <div className="stage-title-wrap">
          <h2 className="stage-title">RSA Workflow Summary</h2>
          <p className="stage-subtitle">
            Complete flow from prime generation to message recovery.
          </p>
        </div>
      </div>

      <div className="workflow-pipeline">
        {/* Step 1 */}
        <div
          className={`pipeline-step ${hasPrimes ? "completed" : "pending"}`}
          onClick={() => onNavigateStage?.("prime-generation")}
        >
          <span className="pipeline-num-bubble">1</span>
          <div className="pipeline-step-text">
            <span className="pipeline-main">Generate primes</span>
            <span className="pipeline-sub">(using Sieve)</span>
          </div>
        </div>

        <ArrowRight size={16} className="pipeline-arrow" />

        {/* Step 2 */}
        <div
          className={`pipeline-step ${keys ? "completed" : "pending"}`}
          onClick={() => onNavigateStage?.("key-generation")}
        >
          <span className="pipeline-num-bubble">2</span>
          <div className="pipeline-step-text">
            <span className="pipeline-main">Select p and q</span>
            <span className="pipeline-sub">
              {keys ? `p=${keys.p}, q=${keys.q}` : "(distinct primes)"}
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="pipeline-arrow" />

        {/* Step 3 */}
        <div
          className={`pipeline-step ${keys ? "completed" : "pending"}`}
          onClick={() => onNavigateStage?.("key-generation")}
        >
          <span className="pipeline-num-bubble">3</span>
          <div className="pipeline-step-text">
            <span className="pipeline-main">Compute keys</span>
            <span className="pipeline-sub">(n, e, d)</span>
          </div>
        </div>

        <ArrowRight size={16} className="pipeline-arrow" />

        {/* Step 4 */}
        <div
          className={`pipeline-step ${hasCiphertext ? "completed" : "pending"}`}
          onClick={() => onNavigateStage?.("encryption")}
        >
          <span className="pipeline-num-bubble">4</span>
          <div className="pipeline-step-text">
            <span className="pipeline-main">Encrypt message</span>
            <span className="pipeline-sub">
              <em>C</em> = <em>M</em><sup>e</sup> mod <em>n</em>
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="pipeline-arrow" />

        {/* Step 5 */}
        <div
          className={`pipeline-step ${hasDecrypted ? "completed" : "pending"}`}
          onClick={() => onNavigateStage?.("decryption")}
        >
          <span className="pipeline-num-bubble">5</span>
          <div className="pipeline-step-text">
            <span className="pipeline-main">Decrypt message</span>
            <span className="pipeline-sub">
              <em>M</em> = <em>C</em><sup>d</sup> mod <em>n</em>
            </span>
          </div>
        </div>

        <ArrowRight size={16} className="pipeline-arrow" />

        {/* Final Recovery Check */}
        <div className={`pipeline-step ${isMatch && hasDecrypted ? "success-end" : "pending"}`}>
          <CheckCircle2 size={18} className="pipeline-icon" />
          <div className="pipeline-step-text">
            <span className="pipeline-main">Original message</span>
            <span className="pipeline-sub">recovered</span>
          </div>
        </div>
      </div>
    </section>
  );
};
