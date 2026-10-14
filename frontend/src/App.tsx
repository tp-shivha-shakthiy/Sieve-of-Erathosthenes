import { useEffect, useState, useCallback } from "react";
import { Sidebar, NavTab } from "./components/Sidebar";
import { TopHeader } from "./components/TopHeader";
import { PrimeGenCard } from "./components/PrimeGenCard";
import { KeyGenCard } from "./components/KeyGenCard";
import { EncryptionCard } from "./components/EncryptionCard";
import { DecryptionCard } from "./components/DecryptionCard";
import { WorkflowSummaryCard } from "./components/WorkflowSummaryCard";
import { PerformanceView } from "./components/PerformanceView";
import { VisualisationView } from "./components/VisualisationView";
import { AboutView } from "./components/AboutView";
import {
  generateRSAKeys,
  encryptMessage,
  decryptMessage,
  KeyGenResult,
  EncryptionResult,
  DecryptionResult,
} from "./utils/rsaMath";

export interface SieveResult {
  algorithm: string;
  limit: number;
  prime_count: number;
  execution_time_ms: number;
  average_per_run_ms?: number;
  num_threads?: number;
  actual_threads?: number;
  primes: number[];
  speedup?: number;
  efficiency?: number;
  num_processes?: number;
  trial_count?: number;
  ranks?: Array<{
    rank: number;
    low: number;
    high: number;
    workload: number;
    execution_time_ms: number;
  }>;
}

export interface SieveResponse {
  results: SieveResult[];
  timing?: {
    serial_execution_time_ms?: number;
    parallel_execution_time_ms?: number;
  };
  parameters: {
    limit: number;
    algorithm: string;
    num_threads: number;
    return_primes: boolean;
  };
}

export interface SystemInfo {
  cpu_count: number | null;
  architecture: string | null;
  openmp_available: boolean;
  compiler: string | null;
}

const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) || "/api";

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>("home");

  // System Specs
  const [system, setSystem] = useState<SystemInfo | null>(null);

  // Stage 1: Prime Generation State
  const [limit, setLimit] = useState(1000000);
  const [algorithm, setAlgorithm] = useState("both");
  const [numThreads, setNumThreads] = useState(4);
  const [loadingPrimes, setLoadingPrimes] = useState(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);
  const [sieveResponse, setSieveResponse] = useState<SieveResponse | null>(null);
  const [availablePrimes, setAvailablePrimes] = useState<number[]>([]);

  // Stage 2: Key Generation State
  const [primeP, setPrimeP] = useState("9973");
  const [primeQ, setPrimeQ] = useState("9967");
  const [keys, setKeys] = useState<KeyGenResult | null>(null);
  const [keyGenError, setKeyGenError] = useState<string | null>(null);

  // Stage 3: Encryption State
  const [message, setMessage] = useState("Hello IIIT Kottayam");
  const [encryptionResult, setEncryptionResult] = useState<EncryptionResult | null>(null);
  const [encryptError, setEncryptError] = useState<string | null>(null);

  // Stage 4: Decryption State
  const [ciphertextInput, setCiphertextInput] = useState("");
  const [decryptionResult, setDecryptionResult] = useState<DecryptionResult | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  // Fetch System Information
  useEffect(() => {
    fetch(`${API_BASE}/system`)
      .then((res) => (res.ok ? res.json() : null))
      .then((info: SystemInfo | null) => setSystem(info))
      .catch(() => setSystem(null));
  }, []);

  // Run Backend Sieve
  const runSieve = async (targetLimit = limit, targetAlgo = algorithm, targetThreads = numThreads) => {
    setLoadingPrimes(true);
    try {
      const res = await fetch(`${API_BASE}/sieve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: targetLimit,
          algorithm: targetAlgo,
          num_threads: targetThreads,
          return_primes: targetLimit <= 1000000,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Prime generation failed");
      }

      const data = (await res.json()) as SieveResponse;
      setSieveResponse(data);

      // Extract primes if available
      const primeArr = data.results.find((r) => r.primes && r.primes.length > 0)?.primes || [];
      if (primeArr.length > 0) {
        setAvailablePrimes(primeArr);
        // If current primes not set, pick two large candidates from end of list
        if (primeArr.length >= 2) {
          const lastPrime = primeArr[primeArr.length - 1];
          const secondLast = primeArr[primeArr.length - 2];
          setPrimeP(lastPrime.toString());
          setPrimeQ(secondLast.toString());
        }
      }
    } catch (e) {
      console.error("Sieve error:", e);
    } finally {
      setLoadingPrimes(false);
    }
  };

  // Generate Initial RSA Keys on Mount or change
  const handleGenerateKeys = useCallback(() => {
    setKeyGenError(null);
    try {
      const p = BigInt(primeP.trim());
      const q = BigInt(primeQ.trim());

      if (p === q) {
        throw new Error("Primes p and q must be distinct (p ≠ q).");
      }
      if (p < 2n || q < 2n) {
        throw new Error("p and q must be prime numbers greater than 1.");
      }

      const res = generateRSAKeys(p, q);
      setKeys(res);

      // Invalidate dependent encryption & decryption results
      setEncryptionResult(null);
      setCiphertextInput("");
      setDecryptionResult(null);
    } catch (e: unknown) {
      setKeyGenError(e instanceof Error ? e.message : "Key generation failed.");
      setKeys(null);
      setEncryptionResult(null);
      setCiphertextInput("");
      setDecryptionResult(null);
    }
  }, [primeP, primeQ]);

  // Initial calculation on first load
  useEffect(() => {
    handleGenerateKeys();
  }, []);

  // Handle Prime Changes (State Invalidation)
  const handlePrimePChange = (val: string) => {
    setPrimeP(val);
    setKeys(null);
    setEncryptionResult(null);
    setCiphertextInput("");
    setDecryptionResult(null);
  };

  const handlePrimeQChange = (val: string) => {
    setPrimeQ(val);
    setKeys(null);
    setEncryptionResult(null);
    setCiphertextInput("");
    setDecryptionResult(null);
  };

  // Encrypt Message Handler
  const handleEncrypt = () => {
    if (!keys) return;
    setEncryptError(null);
    try {
      const enc = encryptMessage(message, keys.e, keys.n);
      setEncryptionResult(enc);
      setCiphertextInput(enc.ciphertextFormatted);
      // Invalidate prior decryption result when re-encrypting
      setDecryptionResult(null);
    } catch (e: unknown) {
      setEncryptError(e instanceof Error ? e.message : "Encryption failed.");
    }
  };

  // Plaintext Change Handler (State Invalidation)
  const handleMessageChange = (val: string) => {
    setMessage(val);
    setEncryptionResult(null);
    setCiphertextInput("");
    setDecryptionResult(null);
  };

  // Decrypt Message Handler
  const handleDecrypt = () => {
    if (!keys) return;
    setDecryptError(null);
    try {
      const dec = decryptMessage(ciphertextInput, keys.d, keys.n, message);
      setDecryptionResult(dec);
    } catch (e: unknown) {
      setDecryptError(e instanceof Error ? e.message : "Decryption failed.");
    }
  };

  const handleNavigateStage = (stageId: string) => {
    if (stageId === "home") {
      setActiveTab("home");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setActiveTab("home");
      setTimeout(() => {
        document.getElementById(stageId)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  };

  // Run Multi-thread Benchmark for Performance View
  const handleRunMultiThreadBenchmark = async (benchLimit: number, mpiProcesses: number[]) => {
    setLoadingPrimes(true);
    setBenchmarkError(null);
    try {
      const res = await fetch(`${API_BASE}/benchmark`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: benchLimit,
          algorithm: "both",
          num_threads: 4,
          return_primes: false,
          include_mpi: true,
          mpi_processes: mpiProcesses,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Native MPI benchmark failed.");
      setSieveResponse(data as SieveResponse);
    } catch (error) {
      setBenchmarkError(error instanceof Error ? error.message : "Native MPI benchmark failed.");
    } finally {
      setLoadingPrimes(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

      {/* Main App Body */}
      <main
        className={`app-main-content ${
          activeTab === "visualisation" || activeTab === "performance" ? "demo-mode" : ""
        }`}
      >
        {/* Top Title & Info Header */}
        <TopHeader />

        {/* View Switcher */}
        {activeTab === "home" && (
          <div className="stage-cards-stack">
            {/* Stage 1: Prime Generation */}
            <PrimeGenCard
              limit={limit}
              algorithm={algorithm}
              numThreads={numThreads}
              loading={loadingPrimes}
              response={sieveResponse}
              onLimitChange={setLimit}
              onAlgorithmChange={setAlgorithm}
              onNumThreadsChange={setNumThreads}
              onRunSieve={() => runSieve()}
            />

            {/* Stage 2: Select Primes & Generate RSA Keys */}
            <KeyGenCard
              primeP={primeP}
              primeQ={primeQ}
              availablePrimes={availablePrimes}
              keys={keys}
              error={keyGenError}
              onPrimePChange={handlePrimePChange}
              onPrimeQChange={handlePrimeQChange}
              onGenerateKeys={handleGenerateKeys}
            />

            {/* Stage 3: Encrypt Message */}
            <EncryptionCard
              message={message}
              keys={keys}
              encryptionResult={encryptionResult}
              error={encryptError}
              onMessageChange={handleMessageChange}
              onEncrypt={handleEncrypt}
            />

            {/* Stage 4: Decrypt Message */}
            <DecryptionCard
              ciphertext={ciphertextInput}
              keys={keys}
              decryptionResult={decryptionResult}
              originalMessage={message}
              error={decryptError}
              onCiphertextChange={setCiphertextInput}
              onDecrypt={handleDecrypt}
            />

            {/* Stage 5: RSA Workflow Summary */}
            <WorkflowSummaryCard
              hasPrimes={sieveResponse !== null}
              keys={keys}
              hasCiphertext={encryptionResult !== null}
              hasDecrypted={decryptionResult !== null}
              isMatch={decryptionResult?.isMatch || false}
              onNavigateStage={handleNavigateStage}
            />
          </div>
        )}

        {activeTab === "prime-gen" && (
          <div className="stage-cards-stack">
            <PrimeGenCard
              limit={limit}
              algorithm={algorithm}
              numThreads={numThreads}
              loading={loadingPrimes}
              response={sieveResponse}
              onLimitChange={setLimit}
              onAlgorithmChange={setAlgorithm}
              onNumThreadsChange={setNumThreads}
              onRunSieve={() => runSieve()}
            />
          </div>
        )}

        {activeTab === "key-gen" && (
          <div className="stage-cards-stack">
            <KeyGenCard
              primeP={primeP}
              primeQ={primeQ}
              availablePrimes={availablePrimes}
              keys={keys}
              error={keyGenError}
              onPrimePChange={handlePrimePChange}
              onPrimeQChange={handlePrimeQChange}
              onGenerateKeys={handleGenerateKeys}
            />
          </div>
        )}

        {activeTab === "encryption" && (
          <div className="stage-cards-stack">
            <EncryptionCard
              message={message}
              keys={keys}
              encryptionResult={encryptionResult}
              error={encryptError}
              onMessageChange={handleMessageChange}
              onEncrypt={handleEncrypt}
            />
          </div>
        )}

        {activeTab === "decryption" && (
          <div className="stage-cards-stack">
            <DecryptionCard
              ciphertext={ciphertextInput}
              keys={keys}
              decryptionResult={decryptionResult}
              originalMessage={message}
              error={decryptError}
              onCiphertextChange={setCiphertextInput}
              onDecrypt={handleDecrypt}
            />
          </div>
        )}

        {activeTab === "visualisation" && (
          <VisualisationView
            keys={keys}
            encryptionResult={encryptionResult}
            decryptionResult={decryptionResult}
          />
        )}

        {activeTab === "performance" && (
          <PerformanceView
            response={sieveResponse}
            system={system}
            onRunMultiThreadBenchmark={handleRunMultiThreadBenchmark}
            loading={loadingPrimes}
            error={benchmarkError}
          />
        )}

        {activeTab === "about" && <AboutView />}
      </main>
    </div>
  );
}
