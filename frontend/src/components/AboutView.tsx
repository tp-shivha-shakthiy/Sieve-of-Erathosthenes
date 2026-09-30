import React from "react";
import { ShieldAlert, Key, Binary, Lock, FileCode } from "lucide-react";

export const AboutView: React.FC = () => {
  return (
    <div className="view-container about-view">
      <div className="view-header">
        <h2 className="view-title">About RSA Cryptography & Mathematical Foundations</h2>
        <p className="view-subtitle">
          Comprehensive guide to public-key cryptography, asymmetric encryption, and computational number theory.
        </p>
      </div>

      {/* Educational Disclaimer Banner */}
      <div className="disclaimer-banner">
        <div className="disclaimer-icon">
          <ShieldAlert size={24} className="text-amber-600" />
        </div>
        <div className="disclaimer-text">
          <h4>Educational Demonstration Notice</h4>
          <p>
            This web application is designed strictly for educational and pedagogical purposes to demonstrate
            the mathematical mechanics of RSA and the Sieve of Eratosthenes. Real-world cryptographic implementations
            require at least 2048-bit or 4096-bit primes, cryptographically secure random number generators (CSPRNG),
            and standardized padding mechanisms such as RSA-OAEP (Optimal Asymmetric Encryption Padding) to prevent
            chosen-ciphertext attacks.
          </p>
        </div>
      </div>

      {/* Guide Cards */}
      <div className="about-grid-2">
        <div className="about-card">
          <div className="about-card-head">
            <Key className="text-purple-600" size={22} />
            <h3>1. Why Does RSA Require Prime Numbers?</h3>
          </div>
          <div className="about-card-body">
            <p>
              RSA relies on a mathematical <strong>trapdoor one-way function</strong>. Multiplication of two large
              primes <em>p</em> and <em>q</em> to produce <em>n = p × q</em> is computationally trivial (requiring only a fraction of a millisecond).
            </p>
            <p>
              However, reversing this process—determining the original prime factors <em>p</em> and <em>q</em> given only the composite
              modulus <em>n</em>—is known as the <em>Integer Factorization Problem</em>. For large numbers (e.g. 617 decimal digits in 2048-bit RSA),
              factorization with classical computers requires billions of years using the General Number Field Sieve (GNFS).
            </p>
          </div>
        </div>

        <div className="about-card">
          <div className="about-card-head">
            <Binary className="text-blue-600" size={22} />
            <h3>2. The Role of the Sieve of Eratosthenes</h3>
          </div>
          <div className="about-card-body">
            <p>
              Discovered by ancient Greek mathematician Eratosthenes of Cyrene (~240 BC), the Sieve is the optimal
              algorithm for generating all prime numbers up to a specified bound <em>N</em> in <em>O(N log log N)</em> time.
            </p>
            <p>
              In this demonstrator, we implement both single-threaded serial execution and <strong>OpenMP multi-threaded
              cache-blocked parallel execution</strong>. By segmenting the candidate array to fit in CPU L1/L2 caches,
              modern multi-core processors achieve significant parallel speedups.
            </p>
          </div>
        </div>

        <div className="about-card">
          <div className="about-card-head">
            <Lock className="text-emerald-600" size={22} />
            <h3>3. Euler's Totient Theorem & Correctness</h3>
          </div>
          <div className="about-card-body">
            <p>
              Euler's totient function <em>φ(n)</em> counts the positive integers up to <em>n</em> that are relatively prime to <em>n</em>.
              For <em>n = p × q</em>, <em>φ(n) = (p − 1)(q − 1)</em>.
            </p>
            <p>
              By Euler's Theorem, if gcd(<em>M</em>, <em>n</em>) = 1, then:
            </p>
            <div className="math-callout">
              M<sup>φ(n)</sup> ≡ 1 (mod n)
            </div>
            <p>
              Since the keys are constructed such that <em>e · d ≡ 1 (mod φ(n))</em>, there exists an integer <em>k</em>
              such that <em>e · d = 1 + k · φ(n)</em>. Thus:
            </p>
            <div className="math-callout">
              C<sup>d</sup> ≡ (M<sup>e</sup>)<sup>d</sup> ≡ M<sup>ed</sup> ≡ M<sup>1 + kφ(n)</sup> ≡ M · (M<sup>φ(n)</sup>)<sup>k</sup> ≡ M · 1<sup>k</sup> ≡ M (mod n)
            </div>
            <p>This guarantees exact message decryption recovery!</p>
          </div>
        </div>

        <div className="about-card">
          <div className="about-card-head">
            <FileCode className="text-indigo-600" size={22} />
            <h3>4. Extended Euclidean Algorithm</h3>
          </div>
          <div className="about-card-body">
            <p>
              To find the private decryption exponent <em>d</em>, we must solve the linear congruence:
            </p>
            <div className="math-callout">
              e · d ≡ 1 (mod φ(n))
            </div>
            <p>
              This is equivalent to finding integers <em>d</em> and <em>y</em> satisfying <em>Bézout's identity</em>:
            </p>
            <div className="math-callout">
              e · d + φ(n) · y = gcd(e, φ(n)) = 1
            </div>
            <p>
              The Extended Euclidean Algorithm computes <em>d</em> in logarithmic time <em>O(log(min(e, φ(n))))</em>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
