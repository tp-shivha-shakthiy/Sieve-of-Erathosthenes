import json
import math
import os
import platform
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
    proc = subprocess.run(command, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise HTTPException(status_code=500, detail=proc.stderr)
    return json.loads(proc.stdout)


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
    if serial_result and openmp_result:
        serial_result["speedup"] = 1.0
        parallel_time = openmp_result["execution_time_ms"]
        speedup = serial_result["execution_time_ms"] / parallel_time if parallel_time > 0 else 0
        openmp_result["speedup"] = speedup
        thread_count = openmp_result.get("actual_threads") or openmp_result.get("num_threads") or 1
        openmp_result["efficiency"] = speedup / thread_count
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
    return {
        "results": results,
        "timing": attach_timing(results),
        "measurement": {
            "mode": "median_benchmark",
            "samples": BENCHMARK_SAMPLES,
            "timing_repetitions": timing_repetitions,
            "target_timed_interval_ms": TARGET_TIMED_INTERVAL_MS,
            "statistic": "median per-run native computation time",
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

