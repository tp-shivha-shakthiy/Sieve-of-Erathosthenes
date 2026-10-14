import json
import math
import os
import platform
import shutil
import statistics
import subprocess
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Sieve of Eratosthenes API")

def _cors_origins():
    origins = ["http://localhost:5173", "http://localhost:3000"]
    extra = os.environ.get("ALLOWED_ORIGINS")
    if extra:
        origins.extend([o.strip() for o in extra.split(",") if o.strip()])
    return origins


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BIN_DIR = os.path.join(os.path.dirname(__file__), "bin")
BENCHMARK_SAMPLES = 7
CALIBRATION_REPETITIONS = 20
MAX_TIMING_REPETITIONS = 1000
# Leave headroom above the 100 ms minimum so ordinary calibration variance does not
# produce a representative sample shorter than the requested measurable interval.
TARGET_TIMED_INTERVAL_MS = 150.0
DEFAULT_MPI_PROCESSES = [1, 2, 4, 8]
MPI_TIMEOUT_SECONDS = 300


def get_binary(name: str) -> str:
    if sys.platform == "win32":
        path = os.path.join(BIN_DIR, name + ".exe")
    else:
        path = os.path.join(BIN_DIR, name)
    if not os.path.isfile(path):
        raise HTTPException(
            status_code=500,
            detail=f"Binary not found at {path}. Run 'cmake --build build' first.",
        )
    return path


def get_compiler_version() -> str | None:
    try:
        completed = subprocess.run(
            ["g++", "--version"], capture_output=True, text=True, timeout=3
        )
    except OSError:
        return None
    if completed.returncode != 0:
        return None
    return completed.stdout.splitlines()[0] if completed.stdout else None


class SieveRequest(BaseModel):
    limit: int = Field(..., ge=2, le=100_000_000, description="Upper bound for sieve")
    algorithm: str = Field("both", pattern="^(serial|openmp|both)$")
    num_threads: int = Field(4, ge=1, le=64, description="Thread count for OpenMP")
    return_primes: bool = Field(False, description="Include primes array in response")
    include_mpi: bool = Field(False, description="Run the native MPI benchmark")
    mpi_processes: list[int] = Field(default_factory=lambda: DEFAULT_MPI_PROCESSES.copy())


def request_parameters(req: SieveRequest) -> dict:
    """Return a Pydantic v1/v2-compatible request payload."""
    if hasattr(req, "model_dump"):
        return req.model_dump()
    return req.dict()


def run_binary(name: str, req: SieveRequest, timing_repetitions: int) -> dict:
    bin_path = get_binary(name)
    return_primes = "1" if req.return_primes else "0"
    command = [bin_path, str(req.limit)]
    if name == "sieve_openmp":
        command.append(str(req.num_threads))
    command.extend([return_primes, str(timing_repetitions)])
    return run_json_command(command, f"{name} benchmark")


def get_mpi_launcher() -> str:
    launcher = os.environ.get("MPIEXEC") or shutil.which("mpiexec")
    if not launcher and sys.platform == "win32":
        candidate = r"C:\Program Files\Microsoft MPI\Bin\mpiexec.exe"
        if os.path.isfile(candidate):
            launcher = candidate
    if not launcher:
        raise HTTPException(status_code=503, detail="MPI launcher not found. Install Microsoft MPI and ensure mpiexec is available.")
    return launcher


def run_json_command(command: list[str], description: str) -> dict:
    try:
        proc = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=MPI_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as error:
        raise HTTPException(status_code=503, detail=f"Could not start {description}: {error}") from error
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=504, detail=f"{description} timed out after {MPI_TIMEOUT_SECONDS} seconds.") from error
    if proc.returncode != 0:
        detail = proc.stderr.strip() or proc.stdout.strip() or f"exit code {proc.returncode}"
        raise HTTPException(status_code=502, detail=f"{description} failed: {detail}")
    try:
        return json.loads(proc.stdout)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=502, detail=f"{description} returned invalid JSON: {proc.stdout[:500]}") from error


def run_mpi_binary(req: SieveRequest, process_count: int, timing_repetitions: int) -> dict:
    mpi_binary = get_binary("sieve_mpi")
    command = [
        get_mpi_launcher(),
        "-n",
        str(process_count),
        mpi_binary,
        str(req.limit),
        "1" if req.return_primes else "0",
        str(timing_repetitions),
        "0",
    ]
    result = run_json_command(command, f"MPI benchmark with {process_count} processes")
    if result.get("algorithm") != "mpi" or result.get("num_processes") != process_count:
        raise HTTPException(status_code=502, detail=f"MPI returned an unexpected process count or algorithm: {result}")
    return result


def run_algorithms(req: SieveRequest, timing_repetitions: int) -> list[dict]:
    results = []
    if req.algorithm in ("serial", "both"):
        results.append(run_binary("sieve_serial", req, timing_repetitions))
    if req.algorithm in ("openmp", "both"):
        results.append(run_binary("sieve_openmp", req, timing_repetitions))
    return results


def attach_timing(results: list[dict]) -> dict:
    timing = {}
    serial_result = next((result for result in results if result["algorithm"] == "serial"), None)
    openmp_result = next((result for result in results if result["algorithm"] == "openmp"), None)
    if serial_result:
        timing["serial_execution_time_ms"] = serial_result["execution_time_ms"]
    if openmp_result:
        timing["parallel_execution_time_ms"] = openmp_result["execution_time_ms"]
    if serial_result:
        serial_result["speedup"] = 1.0
        for result in results:
            if result is serial_result:
                continue
            parallel_time = result.get("execution_time_ms", 0)
            speedup = serial_result["execution_time_ms"] / parallel_time if parallel_time > 0 else 0
            result["speedup"] = speedup
            workers = result.get("num_processes") if result.get("algorithm") == "mpi" else result.get("actual_threads") or result.get("num_threads") or 1
            result["efficiency"] = speedup / workers if workers else 0
        if openmp_result:
            timing["parallel_execution_time_ms"] = openmp_result["execution_time_ms"]
        mpi_results = [result for result in results if result.get("algorithm") == "mpi"]
        if mpi_results:
            timing["mpi_execution_time_ms"] = mpi_results[0]["execution_time_ms"]
    return timing


def choose_timing_repetitions(calibration_results: list[dict]) -> int:
    positive_times = [result["execution_time_ms"] for result in calibration_results if result["execution_time_ms"] > 0]
    if len(positive_times) != len(calibration_results):
        return MAX_TIMING_REPETITIONS
    fastest_time_ms = min(positive_times)
    return min(MAX_TIMING_REPETITIONS, max(CALIBRATION_REPETITIONS, math.ceil(TARGET_TIMED_INTERVAL_MS / fastest_time_ms)))


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/system")
def system():
    extension = ".exe" if sys.platform == "win32" else ""
    return {
        "cpu_count": os.cpu_count(),
        "architecture": platform.machine() or None,
        "openmp_available": os.path.isfile(
            os.path.join(BIN_DIR, f"sieve_openmp{extension}")
        ),
        "compiler": get_compiler_version(),
    }


@app.post("/sieve")
def run_sieve(req: SieveRequest):
    results = run_algorithms(req, timing_repetitions=1)
    return {
        "results": results,
        "timing": attach_timing(results),
        "measurement": {"mode": "single_run", "samples": 1, "timing_repetitions": 1, "statistic": "single sample"},
        "parameters": request_parameters(req),
    }


@app.post("/benchmark")
def run_benchmark(req: SieveRequest):
    if req.include_mpi and req.algorithm != "both":
        raise HTTPException(status_code=400, detail="MPI benchmarking requires algorithm='both' so Serial and OpenMP baselines use the same N.")
    if req.include_mpi:
        if not req.mpi_processes or len(set(req.mpi_processes)) != len(req.mpi_processes):
            raise HTTPException(status_code=400, detail="mpi_processes must contain at least one unique process count.")
        if any(process_count < 1 or process_count > 64 for process_count in req.mpi_processes):
            raise HTTPException(status_code=400, detail="mpi_processes values must be between 1 and 64.")
    calibration = run_algorithms(req, timing_repetitions=CALIBRATION_REPETITIONS)
    timing_repetitions = choose_timing_repetitions(calibration)
    samples = [run_algorithms(req, timing_repetitions) for _ in range(BENCHMARK_SAMPLES)]
    results = samples[0]
    for result_index, result in enumerate(results):
        result["execution_time_ms"] = statistics.median(
            sample[result_index]["execution_time_ms"] for sample in samples
        )
        result["average_per_run_ms"] = result["execution_time_ms"]
        result["timing_repetitions"] = timing_repetitions
    if req.include_mpi:
        for process_count in req.mpi_processes:
            mpi_samples = [
                run_mpi_binary(req, process_count, timing_repetitions)
                for _ in range(BENCHMARK_SAMPLES)
            ]
            mpi_result = dict(mpi_samples[0])
            mpi_result["execution_time_ms"] = statistics.median(
                sample["execution_time_ms"] for sample in mpi_samples
            )
            mpi_result["average_per_run_ms"] = mpi_result["execution_time_ms"]
            mpi_result["timing_repetitions"] = timing_repetitions
            mpi_result["trial_count"] = BENCHMARK_SAMPLES
            results.append(mpi_result)
    prime_counts = {result["prime_count"] for result in results}
    if len(prime_counts) != 1:
        raise HTTPException(status_code=502, detail=f"Serial, OpenMP, and MPI disagree on prime_count: {prime_counts}")
    return {
        "results": results,
        "timing": attach_timing(results),
        "measurement": {
            "mode": "median_benchmark",
            "samples": BENCHMARK_SAMPLES,
            "timing_repetitions": timing_repetitions,
            "target_timed_interval_ms": TARGET_TIMED_INTERVAL_MS,
            "statistic": "median per-run native computation time",
            "mpi_processes": req.mpi_processes if req.include_mpi else [],
        },
        "parameters": request_parameters(req),
    }


# RSA API Endpoints
class RSAKeyGenRequest(BaseModel):
    p: int = Field(..., ge=2, description="Prime number p")
    q: int = Field(..., ge=2, description="Prime number q")
    e: int | None = Field(None, description="Optional public exponent e")


class RSAEncryptRequest(BaseModel):
    plaintext: str = Field(..., description="Message text to encrypt")
    e: int = Field(..., description="Public exponent e")
    n: int = Field(..., description="Modulus n")


class RSADecryptRequest(BaseModel):
    ciphertext: str = Field(..., description="Space-separated ciphertext block integers")
    d: int = Field(..., description="Private exponent d")
    n: int = Field(..., description="Modulus n")


def _extended_gcd(a: int, b: int):
    old_r, r = a, b
    old_s, s = 1, 0
    while r != 0:
        quotient = old_r // r
        old_r, r = r, old_r - quotient * r
        old_s, s = s, old_s - quotient * s
    return old_r, old_s


def _mod_inverse(e: int, phi: int) -> int:
    g, x = _extended_gcd(e, phi)
    if g != 1:
        raise HTTPException(status_code=400, detail=f"No modular inverse for e={e} mod {phi}")
    return (x % phi + phi) % phi


@app.post("/rsa/keys")
def rsa_keys(req: RSAKeyGenRequest):
    if req.p == req.q:
        raise HTTPException(status_code=400, detail="p and q must be distinct primes")
    n = req.p * req.q
    phi = (req.p - 1) * (req.q - 1)
    e = req.e
    if not e:
        candidates = [65537, 17, 257, 3, 5, 7, 11, 13, 19, 23, 29, 31]
        e = next((c for c in candidates if c < phi and math.gcd(c, phi) == 1), None)
        if not e:
            cand = 3
            while cand < phi:
                if math.gcd(cand, phi) == 1:
                    e = cand
                    break
                cand += 2
    if not e or math.gcd(e, phi) != 1:
        raise HTTPException(status_code=400, detail="Could not find valid public exponent e")
    d = _mod_inverse(e, phi)
    return {
        "p": req.p,
        "q": req.q,
        "n": n,
        "phi": phi,
        "e": e,
        "d": d,
        "public_key": {"e": e, "n": n},
        "private_key": {"d": d, "n": n},
    }

