import React, { useState } from "react";
import { KeyRound, ShieldCheck, Key, BookOpen, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { KeyGenResult } from "../utils/rsaMath";

interface KeyGenCardProps {
  primeP: string;
  primeQ: string;
  availablePrimes: number[];
  keys: KeyGenResult | null;
  error: string | null;
  onPrimePChange: (val: string) => void;
  onPrimeQChange: (val: string) => void;
  onGenerateKeys: () => void;
}

export const KeyGenCard: React.FC<KeyGenCardProps> = ({
  primeP,
  primeQ,
  availablePrimes,
  keys,
  error,
  onPrimePChange,
  onPrimeQChange,
  onGenerateKeys,
}) => {
  const [showMathDetails, setShowMathDetails] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);
  const [copiedPriv, setCopiedPriv] = useState(false);

  const copyPublicKey = () => {
    if (!keys) return;
    navigator.clipboard.writeText(`(${keys.e.toString()}, ${keys.n.toString()})`);
    setCopiedPub(true);
    setTimeout(() => setCopiedPub(false), 1500);
  };

  const copyPrivateKey = () => {
    if (!keys) return;
    navigator.clipboard.writeText(`(${keys.d.toString()}, ${keys.n.toString()})`);
    setCopiedPriv(true);
    setTimeout(() => setCopiedPriv(false), 1500);
  };

  // Selectable preset prime pairs
  const presetPairs = [
    { p: "9973", q: "9967", label: "Large (4-digit): 9973 & 9967" },
    { p: "3571", q: "3559", label: "Medium (4-digit): 3571 & 3559" },
    { p: "1009", q: "1013", label: "Small (4-digit): 1009 & 1013" },
    { p: "61", q: "53", label: "Textbook (2-digit): 61 & 53" },
  ];

  return (
    <section className="stage-card stage-card-keys" id="key-generation">
      <div className="stage-header">
        <div className="stage-badge badge-purple">2</div>
        <div className="stage-title-wrap">
          <h2 className="stage-title">Select Two Prime & Generate RSA Keys</h2>
          <p className="stage-subtitle">
            Choose two prime numbers p and q from the generated list, and compute
            the public and private keys.
          </p>
        </div>
      </div>

      <div className="stage-grid-3">
        {/* Column 1: Prime Selectors & Action */}
        <div className="card-panel panel-key-inputs">
          <div className="form-group">
            <label htmlFor="prime-p" className="field-label">
              Prime p
            </label>
            {availablePrimes.length > 0 && availablePrimes.length <= 500 ? (
              <select
                id="prime-p"
                className="select-input"
                value={primeP}
                onChange={(e) => onPrimePChange(e.target.value)}
              >
                {availablePrimes.map((p) => (
                  <option key={p} value={p.toString()}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="prime-p"
                type="number"
                className="text-input"
                value={primeP}
                onChange={(e) => onPrimePChange(e.target.value)}
                placeholder="e.g. 9973"
              />
            )}
            <span className="field-hint">Prime number selected from generated list</span>
          </div>

          <div className="form-group">
            <label htmlFor="prime-q" className="field-label">
              Prime q
            </label>
            {availablePrimes.length > 0 && availablePrimes.length <= 500 ? (
              <select
                id="prime-q"
                className="select-input"
                value={primeQ}
                onChange={(e) => onPrimeQChange(e.target.value)}
              >
                {availablePrimes.map((q) => (
                  <option key={q} value={q.toString()}>
                    {q}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="prime-q"
                type="number"
                className="text-input"
                value={primeQ}
                onChange={(e) => onPrimeQChange(e.target.value)}
                placeholder="e.g. 9967"
              />
            )}
            <span className="field-hint">Prime number selected from generated list</span>
          </div>

          {/* Quick presets */}
          <div className="preset-row">
            <span className="preset-label">Quick Presets:</span>
            <div className="preset-chips">
              {presetPairs.map((pair, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="preset-chip"
                  onClick={() => {
                    onPrimePChange(pair.p);
                    onPrimeQChange(pair.q);
                  }}
                >
                  {pair.p} & {pair.q}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="field-error">{error}</div>}

          <button
            type="button"
            className="btn-purple btn-gen-keys"
            onClick={onGenerateKeys}
          >
            <KeyRound size={18} />
            <span>Generate RSA Keys</span>
          </button>
        </div>

        {/* Column 2: Key Generation Steps */}
        <div className="card-panel panel-key-steps">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">Key Generation Steps</h3>
          </div>

          <div className="key-steps-list">
            <div className="key-step-item">
              <span className="key-step-bubble">1</span>
              <div className="key-step-content">
                <span className="step-math">
                  Compute <em>n</em> = <em>p</em> × <em>q</em>
                </span>
                <span className="step-desc-sub">Modulus for public & private keys</span>
              </div>
            </div>

            <div className="key-step-item">
              <span className="key-step-bubble">2</span>
              <div className="key-step-content">
                <span className="step-math">
                  Compute <em>φ(n)</em> = (<em>p</em> − 1)(<em>q</em> − 1)
                </span>
                <span className="step-desc-sub">Euler's totient (secret count of coprimes)</span>
              </div>
            </div>

            <div className="key-step-item">
              <span className="key-step-bubble">3</span>
              <div className="key-step-content">
                <span className="step-math">
                  Choose public exponent <em>e</em> (commonly 65537)
                </span>
                <span className="step-desc-sub">Must satisfy gcd(e, φ(n)) = 1</span>
              </div>
            </div>

            <div className="key-step-item">
              <span className="key-step-bubble">4</span>
              <div className="key-step-content">
                <span className="step-math">
                  Compute private exponent <em>d</em> = <em>e</em>⁻¹ mod <em>φ(n)</em>
                </span>
                <span className="step-desc-sub">Modular inverse via Extended Euclidean Algorithm</span>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Generated Keys & Values */}
        <div className="card-panel panel-key-results">
          <div className="panel-inner-heading">
            <h3 className="panel-subhead">Generated Keys</h3>
          </div>

          <div className="results-list">
            <div className="result-row">
              <span className="result-label">
                <em>n</em> = <em>p</em> × <em>q</em>
              </span>
              <strong className="result-value">
                {keys ? keys.n.toLocaleString() : "-"}
              </strong>
            </div>

            <div className="result-row">
              <span className="result-label">
                <em>φ(n)</em>
              </span>
              <strong className="result-value">
                {keys ? keys.phi.toLocaleString() : "-"}
              </strong>
            </div>

            <div className="result-row">
              <span className="result-label">
                <em>e</em> (public exponent)
              </span>
              <strong className="result-value">
                {keys ? keys.e.toLocaleString() : "-"}
              </strong>
            </div>

            <div className="result-row">
              <span className="result-label">
                <em>d</em> (private exponent)
              </span>
              <strong className="result-value text-indigo-600">
                {keys ? keys.d.toLocaleString() : "-"}
              </strong>
            </div>
          </div>

          {/* Key Badges */}
          {keys && (
            <div className="key-badges-grid">
              <div className="key-badge key-badge-public" onClick={copyPublicKey} title="Click to copy Public Key">
                <div className="key-badge-header">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span>Public Key (e, n)</span>
                  {copiedPub ? <Check size={12} /> : <Copy size={12} className="opacity-60" />}
                </div>
                <div className="key-badge-value">
                  ({keys.e.toLocaleString()}, {keys.n.toLocaleString()})
                </div>
              </div>

              <div className="key-badge key-badge-private" onClick={copyPrivateKey} title="Click to copy Private Key">
                <div className="key-badge-header">
                  <Key size={16} className="text-blue-600" />
                  <span>Private Key (d, n)</span>
                  {copiedPriv ? <Check size={12} /> : <Copy size={12} className="opacity-60" />}
                </div>
                <div className="key-badge-value">
                  ({keys.d.toLocaleString()}, {keys.n.toLocaleString()})
                </div>
              </div>
            </div>
          )}

          {keys && (
            <button
              type="button"
              className="prime-browser-toggle"
              onClick={() => setShowMathDetails(!showMathDetails)}
            >
              <BookOpen size={14} />
              <span>{showMathDetails ? "Hide Math Breakdown" : "View Step-by-Step Math"}</span>
              {showMathDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Step-by-Step Mathematical Explanation */}
      {showMathDetails && keys && (
        <div className="math-details-drawer">
          <div className="math-step-card">
            <h4>Mathematical Breakdown (WHAT → WHY → FORMULA → VALUES → RESULT)</h4>

            <div className="step-breakdown-grid">
              <div className="breakdown-item">
                <span className="breakdown-tag tag-what">WHAT</span>
                <p>{keys.explanation.what}</p>
              </div>

              <div className="breakdown-item">
                <span className="breakdown-tag tag-why">WHY</span>
                <p>{keys.explanation.why}</p>
              </div>

              <div className="breakdown-item">
                <span className="breakdown-tag tag-formula">FORMULA</span>
                <code>{keys.explanation.formula}</code>
              </div>

              <div className="breakdown-item">
                <span className="breakdown-tag tag-values">SUBSTITUTED VALUES</span>
                <pre>{keys.explanation.substituted}</pre>
              </div>

              <div className="breakdown-item">
                <span className="breakdown-tag tag-result">RESULT</span>
                <pre>{keys.explanation.result}</pre>
              </div>
            </div>

            {/* Extended Euclidean steps table */}
            {keys.egcdSteps && keys.egcdSteps.length > 0 && (
              <div className="egcd-table-container">
                <h5>Extended Euclidean Algorithm Trace for d ≡ {keys.e.toString()}⁻¹ mod {keys.phi.toString()}</h5>
                <table className="egcd-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Dividend (a)</th>
                      <th>Divisor (b)</th>
                      <th>Quotient (q)</th>
                      <th>Remainder (r)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {keys.egcdSteps.slice(0, 8).map((st) => (
                      <tr key={st.step}>
                        <td>{st.step}</td>
                        <td>{st.a}</td>
                        <td>{st.b}</td>
                        <td>{st.quotient}</td>
                        <td>{st.remainder}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
