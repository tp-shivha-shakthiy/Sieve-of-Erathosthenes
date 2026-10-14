"""Capture MPI strong-scaling measurements for 1, 2, 4, and 8 ranks.

This runner never fills missing MPI values from OpenMP data. It writes MPI rank-0
JSON records in the existing executable JSON shape and a comparison CSV with
serial/OpenMP/MPI medians and derived metrics.
"""

import csv
import json
import os
import statistics
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN_DIR = ROOT / "backend" / "bin"
RESULTS_DIR = ROOT / "results"
LIMIT = 100_000_000
PROCESS_COUNTS = (1, 2, 4, 8)
TRIALS = 5
TIMING_REPETITIONS = 20
EXPECTED_PRIME_COUNT = 5_761_455


def binary(name: str) -> Path:
    suffix = ".exe" if sys.platform == "win32" else ""
    path = BIN_DIR / f"{name}{suffix}"
    if not path.is_file():
        raise FileNotFoundError(f"Missing {path}. Build the native binaries first.")
    return path


def mpi_launcher() -> str:
    launcher = os.environ.get("MPIEXEC", "mpiexec")
    completed = subprocess.run([launcher, "-help"], capture_output=True, text=True)
    if completed.returncode not in (0, 1):
        raise FileNotFoundError(f"MPI launcher is not usable: {launcher}")
    return launcher


def run(command: list[str]) -> dict[str, object]:
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    payload = json.loads(completed.stdout)
    if payload.get("prime_count") != EXPECTED_PRIME_COUNT:
        raise RuntimeError(f"Wrong prime count for {command}: {payload}")
    if float(payload.get("execution_time_ms", 0)) <= 0:
        raise RuntimeError(f"Non-positive timed result for {command}: {payload}")
    return payload


def median_time(samples: list[dict[str, object]]) -> float:
    return statistics.median(float(sample["execution_time_ms"]) for sample in samples)


def main() -> None:
    serial = binary("sieve_serial")
    openmp = binary("sieve_openmp")
    mpi = binary("sieve_mpi")
    launcher = mpi_launcher()

    serial_samples = [run([str(serial), str(LIMIT), "0", str(TIMING_REPETITIONS)]) for _ in range(TRIALS)]
    openmp_samples = [run([str(openmp), str(LIMIT), "8", "0", str(TIMING_REPETITIONS)]) for _ in range(TRIALS)]
    serial_ms = median_time(serial_samples)
    openmp_ms = median_time(openmp_samples)

    mpi_records: list[dict[str, object]] = []
    csv_rows: list[dict[str, object]] = []
    for process_count in PROCESS_COUNTS:
        command = [launcher, "-n", str(process_count), str(mpi), str(LIMIT), "0", str(TIMING_REPETITIONS), "0"]
        samples = [run(command) for _ in range(TRIALS)]
        record = dict(samples[0])
        record["execution_time_ms"] = median_time(samples)
        record["average_per_run_ms"] = record["execution_time_ms"]
        record["trial_count"] = TRIALS
        mpi_records.append(record)
        mpi_ms = float(record["execution_time_ms"])
        speedup = serial_ms / mpi_ms
        csv_rows.append({
            "limit": LIMIT,
            "processes": process_count,
            "serial_time_ms": round(serial_ms, 6),
            "openmp_time_ms": round(openmp_ms, 6),
            "mpi_time_ms": round(mpi_ms, 6),
            "serial_vs_mpi_speedup": round(speedup, 6),
            "mpi_efficiency": round(speedup / process_count, 6),
            "prime_count": record["prime_count"],
            "trial_count": TRIALS,
        })

    RESULTS_DIR.mkdir(exist_ok=True)
    (RESULTS_DIR / "mpi_benchmark.json").write_text(json.dumps(mpi_records, indent=2), encoding="ascii")
    with (RESULTS_DIR / "mpi_benchmark.csv").open("w", newline="", encoding="ascii") as handle:
        writer = csv.DictWriter(handle, fieldnames=csv_rows[0].keys())
        writer.writeheader()
        writer.writerows(csv_rows)
    print(json.dumps(mpi_records, indent=2))


if __name__ == "__main__":
    main()
