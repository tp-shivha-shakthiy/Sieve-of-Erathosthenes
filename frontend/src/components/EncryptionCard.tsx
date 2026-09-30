import React, { useState } from "react";
import { Lock, Copy, Check, ChevronDown, ChevronUp, ArrowRight, BookOpen } from "lucide-react";
import { EncryptionResult, KeyGenResult } from "../utils/rsaMath";

interface EncryptionCardProps {
  message: string;
  keys: KeyGenResult | null;
  encryptionResult: EncryptionResult | null;
  error: string | null;
  onMessageChange: (msg: string) => void;
  onEncrypt: () => void;
}

export const EncryptionCard: React.FC<EncryptionCardProps> = ({
  message,
  keys,
  encryptionResult,
  error,
  onMessageChange,
  onEncrypt,
}) => {
  const [copied, setCopied] = useState(false);
  const [showBlockBreakdown, setShowBlockBreakdown] = useState(false);

  const copyCiphertext = () => {
    if (!encryptionResult?.ciphertextFormatted) return;
    navigator.clipboard.writeText(encryptionResult.ciphertextFormatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="stage-card stage-card-encrypt" id="encryption">
      <div className="stage-header">
        <div className="stage-badge badge-green">3</div>
        <div className="stage-title-wrap">
          <h2 className="stage-title">Encrypt a Message</h2>
          <p className="stage-subtitle">
            Convert your message into numbers and encrypt using the public key.
          </p>
        </div>
      </div>

      <div className="stage-grid-3">
        {/* Column 1: Message Input */}
        <div className="card-panel panel-encrypt-input">
          <div className="form-group">
            <label htmlFor="message-input" className="field-label">
              Enter a message
            </label>
            <textarea
              id="message-input"
              className="message-textarea"
              rows={3}
              maxLength={1000}
              value={message}
              onChange={(e) => onMessageChange(e.target.value)}
              placeholder="e.g. Hello IIIT Kottayam"
            />
            <div className="textarea-footer">
              <span className="char-counter">{message.length}/1000 characters</span>
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
            className="btn-green btn-encrypt"
            onClick={onEncrypt}
            disabled={!keys || !message.trim()}
          >
            <Lock size={18} />
            <span>Encrypt Message</span>
          </button>
        </div>

        {/* Column 2: Encryption Process Flow */}
        <div className="card-panel panel-process">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">Encryption Process</h3>
          </div>

          <div className="process-flow-row">
            <div className="process-node">
              <span className="node-title">Plaintext</span>
              <span className="node-sub">(letters)</span>
            </div>

            <ArrowRight size={16} className="process-arrow" />

            <div className="process-node">
              <span className="node-title">Convert to numbers</span>
              <span className="node-sub">(ASCII/UTF-8)</span>
            </div>

            <ArrowRight size={16} className="process-arrow" />

            <div className="process-node active-node-green">
              <span className="node-title">
                <em>C</em> = <em>M</em><sup>e</sup> mod <em>n</em>
              </span>
              <span className="node-sub">(for each block)</span>
            </div>

            <ArrowRight size={16} className="process-arrow" />

            <div className="process-node">
              <span className="node-title">Ciphertext</span>
              <span className="node-sub">(numbers)</span>
            </div>
          </div>

          <div className="process-equation-note">
            <span>Using Public Key: </span>
            <code>
              (e = {keys?.e.toLocaleString() || "e"}, n = {keys?.n.toLocaleString() || "n"})
            </code>
          </div>
        </div>

        {/* Column 3: Ciphertext Result */}
        <div className="card-panel panel-ciphertext">
          <div className="panel-inner-heading">
            <div className="title-with-badge">
              <h3 className="panel-subhead">Ciphertext (C)</h3>
              {encryptionResult && (
                <span className="block-count-badge">
                  {encryptionResult.blockDetails.length} block
                  {encryptionResult.blockDetails.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            {encryptionResult?.ciphertextFormatted && (
              <button
                type="button"
                className="icon-copy-btn"
                onClick={copyCiphertext}
                title="Copy ciphertext"
              >
                {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              </button>
            )}
          </div>

          <div className="ciphertext-box">
            {encryptionResult?.ciphertextFormatted ? (
              <pre className="ciphertext-text">{encryptionResult.ciphertextFormatted}</pre>
            ) : (
              <span className="placeholder-text">
                Encrypted numeric ciphertext will appear here...
              </span>
            )}
          </div>

          {encryptionResult && (
            <button
              type="button"
              className="prime-browser-toggle"
              onClick={() => setShowBlockBreakdown(!showBlockBreakdown)}
            >
              <BookOpen size={14} />
              <span>
                {showBlockBreakdown
                  ? "Hide Block Calculations"
                  : "View Substituted Block Values"}
              </span>
              {showBlockBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Block-by-Block Substitution Breakdown */}
      {showBlockBreakdown && encryptionResult && (
        <div className="math-details-drawer">
          <div className="math-step-card">
            <h4>Encryption Block Calculations: C = Mᵉ mod n</h4>

            <div className="step-breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-tag tag-what">WHAT</span>
                <p>{encryptionResult.sampleStep.what}</p>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-why">WHY</span>
                <p>{encryptionResult.sampleStep.why}</p>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-formula">FORMULA</span>
                <code>{encryptionResult.sampleStep.formula}</code>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-values">SUBSTITUTED</span>
                <pre>{encryptionResult.sampleStep.substituted}</pre>
              </div>
              <div className="breakdown-item">
                <span className="breakdown-tag tag-result">RESULT</span>
                <pre>{encryptionResult.sampleStep.result}</pre>
              </div>
            </div>

            <div className="blocks-table-container">
              <h5>All Encrypted Message Blocks</h5>
              <table className="egcd-table">
                <thead>
                  <tr>
                    <th>Block #</th>
                    <th>Text Chunk</th>
                    <th>ASCII Codes</th>
                    <th>Numeric Block (M &lt; n)</th>
                    <th>Substitution Formula</th>
                    <th>Ciphertext (C)</th>
                  </tr>
                </thead>
                <tbody>
                  {encryptionResult.blockDetails.map((b) => (
                    <tr key={b.index}>
                      <td><strong>#{b.index}</strong></td>
                      <td><code>"{b.chunk}"</code></td>
                      <td>[{b.asciiValues.join(", ")}]</td>
                      <td><strong>{b.M}</strong></td>
                      <td><code>{b.calculation}</code></td>
                      <td className="text-emerald-700 font-mono"><strong>{b.C}</strong></td>
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
