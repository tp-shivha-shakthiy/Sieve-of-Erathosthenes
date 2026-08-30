import json
import os
import platform
import subprocess
import sys
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="Sieve of Eratosthenes API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BIN_DIR = os.path.join(os.path.dirname(__file__), "bin")


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
    results = []

    if req.algorithm in ("serial", "both"):
        bin_path = get_binary("sieve_serial")
        rp = "1" if req.return_primes else "0"
        proc = subprocess.run(
            [bin_path, str(req.limit), rp],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=proc.stderr)
        results.append(json.loads(proc.stdout))

    if req.algorithm in ("openmp", "both"):
        bin_path = get_binary("sieve_openmp")
        rp = "1" if req.return_primes else "0"
        proc = subprocess.run(
            [bin_path, str(req.limit), str(req.num_threads), rp],
            capture_output=True,
            text=True,
            timeout=300,
        )
        if proc.returncode != 0:
            raise HTTPException(status_code=500, detail=proc.stderr)
        results.append(json.loads(proc.stdout))

    if req.algorithm == "both" and len(results) == 2:
        serial_time = results[0]["execution_time_ms"]
        openmp_time = results[1]["execution_time_ms"]
        results[0]["speedup"] = 1.0
        results[1]["speedup"] = round(serial_time / openmp_time, 2) if openmp_time > 0 else 0

    return {"results": results, "parameters": req.model_dump()}
