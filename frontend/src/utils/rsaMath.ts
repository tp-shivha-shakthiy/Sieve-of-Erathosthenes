/**
 * RSA Cryptography Math Utilities
 * Arbitrary-precision calculations using JavaScript BigInt.
 */

export interface ExtendedGcdStep {
  step: number;
  a: string;
  b: string;
  quotient: string;
  remainder: string;
}

export interface ExtendedGcdResult {
  gcd: bigint;
  x: bigint;
  y: bigint;
  steps: ExtendedGcdStep[];
}

export interface KeyGenResult {
  p: bigint;
  q: bigint;
  n: bigint;
  phi: bigint;
  e: bigint;
  d: bigint;
  egcdSteps: ExtendedGcdStep[];
  explanation: {
    what: string;
    why: string;
    formula: string;
    substituted: string;
    result: string;
  };
}

export interface BlockEncryptionDetail {
  index: number;
  chunk: string;
  asciiValues: number[];
  M: string;
  e: string;
  n: string;
  formula: string;
  calculation: string;
  C: string;
}

export interface BlockDecryptionDetail {
  index: number;
  C: string;
  d: string;
  n: string;
  formula: string;
  calculation: string;
  M: string;
  asciiValues: number[];
  recoveredChunk: string;
}

export interface EncryptionResult {
  plaintext: string;
  ciphertextBlocks: string[];
  ciphertextFormatted: string;
  blockDetails: BlockEncryptionDetail[];
  charsPerBlock: number;
  sampleStep: {
    what: string;
    why: string;
    formula: string;
    substituted: string;
    result: string;
  };
}

export interface DecryptionResult {
  ciphertext: string;
  decryptedText: string;
  blockDetails: BlockDecryptionDetail[];
  isMatch: boolean;
  sampleStep: {
    what: string;
    why: string;
    formula: string;
    substituted: string;
    result: string;
  };
}

/**
 * Standard Greatest Common Divisor
 */
export function gcd(a: bigint, b: bigint): bigint {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y !== 0n) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x;
}

/**
 * Extended Euclidean Algorithm: solves a*x + b*y = gcd(a, b)
 */
export function extendedGcd(a: bigint, b: bigint): ExtendedGcdResult {
  let old_r = a, r = b;
  let old_s = 1n, s = 0n;
  let old_t = 0n, t = 1n;

  const steps: ExtendedGcdStep[] = [];
  let stepIndex = 1;

  while (r !== 0n) {
    const quotient = old_r / r;
    const remainder = old_r % r;

    steps.push({
      step: stepIndex++,
      a: old_r.toString(),
      b: r.toString(),
      quotient: quotient.toString(),
      remainder: remainder.toString(),
    });

    old_r = r;
    r = remainder;

    const next_s = old_s - quotient * s;
    old_s = s;
    s = next_s;

    const next_t = old_t - quotient * t;
    old_t = t;
    t = next_t;
  }

  return {
    gcd: old_r,
    x: old_s,
    y: old_t,
    steps,
  };
}

/**
 * Modular Inverse: computes d such that (e * d) % phi === 1
 */
export function modInverse(e: bigint, phi: bigint): { d: bigint; steps: ExtendedGcdStep[] } {
  const { gcd: g, x, steps } = extendedGcd(e, phi);
  if (g !== 1n) {
    throw new Error(`Modular inverse does not exist: gcd(${e}, ${phi}) = ${g} != 1`);
  }
  // Ensure d is positive in range [1, phi - 1]
  const d = ((x % phi) + phi) % phi;
  return { d, steps };
}

/**
 * Efficient Modular Exponentiation (Square-and-Multiply): (base^exp) % mod
 */
export function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  let b = ((base % mod) + mod) % mod;
  let e = exp;

  while (e > 0n) {
    if (e % 2n === 1n) {
      result = (result * b) % mod;
    }
    e = e / 2n;
    b = (b * b) % mod;
  }
  return result;
}

/**
 * Automatically pick the best standard public exponent e coprime to phi(n).
 * Prefers 65537 (2^16 + 1), then falls back to 17, 257, 3, 5, 7, etc.
 */
export function choosePublicExponent(phi: bigint): bigint {
  const candidates = [65537n, 17n, 257n, 3n, 5n, 7n, 11n, 13n, 19n, 23n, 29n, 31n];
  for (const candidate of candidates) {
    if (candidate < phi && gcd(candidate, phi) === 1n) {
      return candidate;
    }
  }
  // Fallback: test consecutive odd numbers starting from 3
  let cand = 3n;
  while (cand < phi) {
    if (gcd(cand, phi) === 1n) {
      return cand;
    }
    cand += 2n;
  }
  throw new Error("Unable to find a valid public exponent coprime to φ(n)");
}

/**
 * Generate RSA keys from primes p and q
 */
export function generateRSAKeys(p: bigint, q: bigint, customE?: bigint): KeyGenResult {
  if (p <= 1n || q <= 1n) {
    throw new Error("Primes p and q must be greater than 1.");
  }
  if (p === q) {
    throw new Error("Prime p and prime q must be distinct (p ≠ q).");
  }

  const n = p * q;
  const phi = (p - 1n) * (q - 1n);

  let e = customE;
  if (!e || e <= 1n || e >= phi || gcd(e, phi) !== 1n) {
    e = choosePublicExponent(phi);
  }

  const { d, steps } = modInverse(e, phi);

  return {
    p,
    q,
    n,
    phi,
    e,
    d,
    egcdSteps: steps,
    explanation: {
      what: "Key pair generation from two prime numbers p and q",
      why: "RSA security rests on the difficulty of factoring the product n = p × q. With p and q, Euler's totient φ(n) can be computed to determine the private exponent d.",
      formula: "n = p × q, φ(n) = (p - 1)(q - 1), e · d ≡ 1 (mod φ(n))",
      substituted: `n = ${p} × ${q} = ${n}\nφ(n) = (${p} - 1) × (${q} - 1) = ${phi}\nChoose e = ${e} (gcd(${e}, ${phi}) = 1)\nd = ${e}⁻¹ mod ${phi} = ${d}`,
      result: `Public Key: (e = ${e}, n = ${n})\nPrivate Key: (d = ${d}, n = ${n})`,
    },
  };
}

/**
 * Determine the maximum characters we can fit in a block such that M < n.
 * Base 256 encoding for ASCII/UTF-8 bytes.
 */
export function getSafeCharsPerBlock(n: bigint): number {
  if (n <= 256n) return 1; // 1 character / 1 byte (may still need M < n check)
  let chars = 1;
  let limit = 256n;
  while (limit * 256n < n && chars < 4) {
    limit *= 256n;
    chars++;
  }
  return chars;
}

/**
 * Convert string chunk to BigInt numeric value: M = sum(byte[i] * 256^(len-1-i))
 */
export function chunkToNumber(chunk: string): { M: bigint; asciiValues: number[] } {
  const bytes: number[] = [];
  for (let i = 0; i < chunk.length; i++) {
    bytes.push(chunk.charCodeAt(i));
  }
  let M = 0n;
  for (const b of bytes) {
    M = (M * 256n) + BigInt(b);
  }
  return { M, asciiValues: bytes };
}

/**
 * Convert BigInt numeric value back to string chunk
 */
export function numberToChunk(M: bigint): { chunk: string; asciiValues: number[] } {
  if (M === 0n) return { chunk: "\0", asciiValues: [0] };
  let temp = M;
  const bytes: number[] = [];
  while (temp > 0n) {
    bytes.unshift(Number(temp % 256n));
    temp = temp / 256n;
  }
  const chunk = String.fromCharCode(...bytes);
  return { chunk, asciiValues: bytes };
}

/**
 * Encrypt plaintext using public key (e, n)
 */
export function encryptMessage(
  plaintext: string,
  e: bigint,
  n: bigint,
  forceCharsPerBlock?: number
): EncryptionResult {
  if (!plaintext) {
    return {
      plaintext: "",
      ciphertextBlocks: [],
      ciphertextFormatted: "",
      blockDetails: [],
      charsPerBlock: 1,
      sampleStep: {
        what: "Encryption",
        why: "No message entered",
        formula: "C = M^e mod n",
        substituted: "N/A",
        result: "Empty",
      },
    };
  }

  const charsPerBlock = forceCharsPerBlock || getSafeCharsPerBlock(n);
  const blockDetails: BlockEncryptionDetail[] = [];
  const ciphertextBlocks: string[] = [];

  for (let i = 0; i < plaintext.length; i += charsPerBlock) {
    const chunk = plaintext.slice(i, i + charsPerBlock);
    const { M, asciiValues } = chunkToNumber(chunk);

    if (M >= n) {
      // If block exceeds n, fallback to single character or warn
      throw new Error(
        `Block value M = ${M} exceeds modulus n = ${n}. Please choose larger primes p and q.`
      );
    }

    const C = modPow(M, e, n);
    const cStr = C.toString();
    ciphertextBlocks.push(cStr);

    blockDetails.push({
      index: Math.floor(i / charsPerBlock) + 1,
      chunk,
      asciiValues,
      M: M.toString(),
      e: e.toString(),
      n: n.toString(),
      formula: `C = M^e mod n`,
      calculation: `${M}^${e} mod ${n} = ${C}`,
      C: cStr,
    });
  }

  const firstBlock = blockDetails[0];
  const sampleStep = firstBlock
    ? {
        what: `Encrypting block 1 ("${firstBlock.chunk}")`,
        why: "Public-key modular exponentiation transforms message block M into ciphertext C using recipient's public key (e, n).",
        formula: "C = M^e mod n",
        substituted: `M = ${firstBlock.M} (ASCII: [${firstBlock.asciiValues.join(", ")}])\nC = (${firstBlock.M})^${firstBlock.e} mod ${firstBlock.n}`,
        result: `C = ${firstBlock.C}`,
      }
    : {
        what: "Encryption",
        why: "Modular exponentiation",
        formula: "C = M^e mod n",
        substituted: "-",
        result: "-",
      };

  return {
    plaintext,
    ciphertextBlocks,
    ciphertextFormatted: ciphertextBlocks.join(" "),
    blockDetails,
    charsPerBlock,
    sampleStep,
  };
}

/**
 * Decrypt ciphertext using private key (d, n)
 */
export function decryptMessage(
  ciphertext: string,
  d: bigint,
  n: bigint,
  originalPlaintext?: string
): DecryptionResult {
  if (!ciphertext.trim()) {
    return {
      ciphertext: "",
      decryptedText: "",
      blockDetails: [],
      isMatch: false,
      sampleStep: {
        what: "Decryption",
        why: "No ciphertext provided",
        formula: "M = C^d mod n",
        substituted: "N/A",
        result: "Empty",
      },
    };
  }

  // Support both space-separated blocks and comma/newline separated blocks
  const rawTokens = ciphertext.trim().split(/[\s,]+/);
  const blockDetails: BlockDecryptionDetail[] = [];
  const recoveredChunks: string[] = [];

  for (let i = 0; i < rawTokens.length; i++) {
    const token = rawTokens[i].trim();
    if (!token) continue;

    let C: bigint;
    try {
      C = BigInt(token);
    } catch {
      throw new Error(`Invalid ciphertext token "${token}". Must be integers.`);
    }

    const M = modPow(C, d, n);
    const { chunk, asciiValues } = numberToChunk(M);
    recoveredChunks.push(chunk);

    blockDetails.push({
      index: i + 1,
      C: C.toString(),
      d: d.toString(),
      n: n.toString(),
      formula: `M = C^d mod n`,
      calculation: `${C}^${d} mod ${n} = ${M}`,
      M: M.toString(),
      asciiValues,
      recoveredChunk: chunk,
    });
  }

  const decryptedText = recoveredChunks.join("");
  const isMatch = originalPlaintext !== undefined ? decryptedText === originalPlaintext : true;

  const firstBlock = blockDetails[0];
  const sampleStep = firstBlock
    ? {
        what: `Decrypting block 1 (C = ${firstBlock.C})`,
        why: "Private-key modular exponentiation recovers original block M because (M^e)^d ≡ M^(ed) ≡ M (mod n) by Euler's Totient Theorem.",
        formula: "M = C^d mod n",
        substituted: `C = ${firstBlock.C}\nM = (${firstBlock.C})^${firstBlock.d} mod ${firstBlock.n}`,
        result: `M = ${firstBlock.M} → ASCII/Text: "${firstBlock.recoveredChunk}" (ASCII: [${firstBlock.asciiValues.join(", ")}])`,
      }
    : {
        what: "Decryption",
        why: "Modular exponentiation",
        formula: "M = C^d mod n",
        substituted: "-",
        result: "-",
      };

  return {
    ciphertext,
    decryptedText,
    blockDetails,
    isMatch,
    sampleStep,
  };
}
