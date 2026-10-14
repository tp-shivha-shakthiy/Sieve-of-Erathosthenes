import React, { useState } from "react";
import { Unlock, Copy, Check, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { DecryptionResult, KeyGenResult } from "../utils/rsaMath";

interface DecryptionCardProps {
  ciphertext: string;
  keys: KeyGenResult | null;
  decryptionResult: DecryptionResult | null;
  originalMessage: string;
  error: string | null;
  onCiphertextChange: (val: string) => void;
  onDecrypt: () => void;
}

export const DecryptionCard: React.FC<DecryptionCardProps> = ({
  ciphertext,
  keys,
  decryptionResult,
  originalMessage,
  error,
  onCiphertextChange,
  onDecrypt,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCipher, setCopiedCipher] = useState(false);
  const [showBlockBreakdown, setShowBlockBreakdown] = useState(false);

  const copyDecrypted = () => {
    if (!decryptionResult?.decryptedText) return;
    navigator.clipboard.writeText(decryptionResult.decryptedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyInputCipher = () => {
    if (!ciphertext) return;
    navigator.clipboard.writeText(ciphertext);
    setCopiedCipher(true);
    setTimeout(() => setCopiedCipher(false), 1500);
  };

  return (
    <section className="stage-card stage-card-decrypt" id="decryption">
      <div className="stage-header">
        <div className="stage-badge badge-orange">4</div>
        <div className="stage-title-wrap">
          <h2 className="stage-title">Decrypt the Message</h2>
          <p className="stage-subtitle">
            Use the private key to decrypt the ciphertext and recover the original
            message.
          </p>
        </div>
      </div>

      <div className="stage-grid-3">
        {/* Column 1: Ciphertext Input */}
        <div className="card-panel panel-decrypt-input">
          <div className="form-group">
            <div className="field-label-with-action">
              <label htmlFor="ciphertext-input" className="field-label">
                Ciphertext (C)
              </label>
              {ciphertext && (
                <button
                  type="button"
                  className="icon-copy-btn-sm"
                  onClick={copyInputCipher}
                  title="Copy ciphertext"
                >
                  {copiedCipher ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                </button>
              )}
            </div>
            <textarea
              id="ciphertext-input"
              className="message-textarea font-mono"
              rows={3}
              value={ciphertext}
              onChange={(e) => onCiphertextChange(e.target.value)}
              placeholder="Paste space-separated block integers..."
            />
            <div className="textarea-footer">
              <span className="char-counter">
                {ciphertext.trim() ? `${ciphertext.trim().split(/\s+/).length} block(s)` : "0 blocks"}
              </span>
              {!keys && (
                <span className="text-amber-600 text-xs font-medium">
                  Requires generated RSA keys
                </span>
              )}
            </div>
          </div>

          {error && <div className="field-error">{error}</div>}

          <button
            type="button"
            className="btn-orange btn-decrypt"
            onClick={onDecrypt}
            disabled={!keys || !ciphertext.trim()}
          >
            <Unlock size={18} />
            <span>Decrypt Message</span>
          </button>
        </div>

        {/* Column 2: Decryption Process Flow */}
        <div className="card-panel panel-process">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">Decryption Process</h3>
          </div>

          <div className="process-flow-row">
            <div className="process-node">
              <span className="node-title">Ciphertext</span>
              <span className="node-sub">(numbers)</span>
            </div>

            <ArrowRight size={16} className="process-arrow" />

            <div className="process-node active-node-orange">
              <span className="node-title">
                <em>M</em> = <em>C</em><sup>d</sup> mod <em>n</em>
              </span>
              <span className="node-sub">(for each block)</span>
            </div>

            <ArrowRight size={16} className="process-arrow" />

            <div className="process-node">
              <span className="node-title">Convert numbers to text</span>
              <span className="node-sub">(ASCII/UTF-8)</span>
            </div>

            <ArrowRight size={16} className="process-arrow" />

            <div className="process-node">
              <span className="node-title">Recovered plaintext</span>
              <span className="node-sub">(letters)</span>
            </div>
          </div>

          <div className="process-equation-note">
            <span>Using Private Key: </span>
            <code>
              (d = {keys?.d.toLocaleString() || "d"}, n = {keys?.n.toLocaleString() || "n"})
            </code>
          </div>
        </div>

        {/* Column 3: Decrypted Message Result */}
        <div className="card-panel panel-decrypted">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">Decrypted Message</h3>
            {decryptionResult?.decryptedText && (
              <button
                type="button"
                className="icon-copy-btn"
                onClick={copyDecrypted}
                title="Copy recovered text"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            )}
          </div>

          <div className="decrypted-box">
            {decryptionResult?.decryptedText ? (
              <div className="decrypted-text-content">
                {decryptionResult.decryptedText}
              </div>
            ) : (
              <span className="placeholder-text">
                Recovered original text will appear here...
              </span>
            )}
          </div>

          {decryptionResult && (
            <div className="decryption-status-wrap">
              {decryptionResult.isMatch ? (
                <div className="success-badge-pill">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span>Message successfully recovered!</span>
                </div>
              ) : (
                <div className="warning-badge-pill">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <span>Output differs from initial input "{originalMessage}"</span>
                </div>
              )}
            </div>
          )}

          {decryptionResult && (
            <button
              type="button"
              className="prime-browser-toggle"
              onClick={() => setShowBlockBreakdown(!showBlockBreakdown)}
            >
              <BookOpen size={14} />
              <span>
                {showBlockBreakdown
                  ? "Hide Decryption Details"
                  : "View Substituted Block Math"}
              </span>
              {showBlockBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Block-by-Block Substitution Breakdown */}
      {showBlockBreakdown && decryptionResult && (
        <div className="math-details-drawer">
          <div className="math-step-card">
            <h4>Decryption Block Calculations: M = Cᵈ mod n</h4>

            <div className="step-breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-tag tag-what">WHAT</span>
                <p>{decryptionResult.sampleStep.what}</p>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-why">WHY</span>
                <p>{decryptionResult.sampleStep.why}</p>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-formula">FORMULA</span>
                <code>{decryptionResult.sampleStep.formula}</code>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-values">SUBSTITUTED</span>
                <pre>{decryptionResult.sampleStep.substituted}</pre>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-result">RESULT</span>
                <pre>{decryptionResult.sampleStep.result}</pre>
              </div>
            </div>

            <div className="blocks-table-container">
              <h5>All Decrypted Message Blocks</h5>
              <table className="egcd-table">
                <thead>
                  <tr>
                    <th>Block #</th>
                    <th>Ciphertext (C)</th>
                    <th>Decryption Formula (Cᵈ mod n)</th>
                    <th>Recovered Integer (M)</th>
                    <th>ASCII Codes</th>
                    <th>Decoded Chunk</th>
                  </tr>
                </thead>
                <tbody>
                  {decryptionResult.blockDetails.map((b) => (
                    <tr key={b.index}>
                      <td><strong>#{b.index}</strong></td>
                      <td className="font-mono text-xs">{b.C}</td>
                      <td><code>{b.calculation}</code></td>
                      <td><strong>{b.M}</strong></td>
                      <td>[{b.asciiValues.join(", ")}]</td>
                      <td className="text-emerald-700 font-bold font-mono">"{b.recoveredChunk}"</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
