"""Run actual repeated strong-scaling measurements against the active C++ binaries."""

import csv
import json
import os
import platform
import statistics
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BIN_DIR = ROOT / "backend" / "bin"
LIMITS = (100_000, 1_000_000, 10_000_000)
THREAD_COUNTS = (1, 2, 4, 8)
REPETITIONS = 5
TIMING_REPETITIONS = 20
EXPECTED_PRIME_COUNTS = {100_000: 9_592, 1_000_000: 78_498, 10_000_000: 664_579}


def binary(name: str) -> Path:
    suffix = ".exe" if sys.platform == "win32" else ""
    path = BIN_DIR / f"{name}{suffix}"
    if not path.is_file():
        raise FileNotFoundError(f"Missing {path}. Build the C++ binaries first.")
    return path


def run(command: list[str], limit: int) -> float:
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    result = json.loads(completed.stdout)
    if result["prime_count"] != EXPECTED_PRIME_COUNTS[limit]:
        raise RuntimeError(f"Incorrect prime count for {command}: {result['prime_count']}")
    return result["execution_time_ms"]


def measure(command: list[str], limit: int) -> list[float]:
    run(command, limit)  # Warm-up prevents one-time startup effects from dominating.
    return [run(command, limit) for _ in range(REPETITIONS)]


def main() -> None:
    serial = binary("sieve_serial")
    openmp = binary("sieve_openmp")
    rows: list[dict[str, object]] = []

    for limit in LIMITS:
        serial_samples = measure([str(serial), str(limit), "0", str(TIMING_REPETITIONS)], limit)
        serial_median = statistics.median(serial_samples)
        for repeat, elapsed in enumerate(serial_samples, 1):
            rows.append({"record_type": "raw", "limit": limit, "algorithm": "serial", "threads": 1,
                         "repeat": repeat, "time_ms": f"{elapsed:.6f}", "median_ms": "", "stddev_ms": "",
                         "speedup": "", "efficiency": "", "cost_ms": "", "overhead_ms": ""})
        rows.append({"record_type": "summary", "limit": limit, "algorithm": "serial", "threads": 1,
                     "repeat": "", "time_ms": "", "median_ms": f"{serial_median:.6f}",
                     "stddev_ms": f"{statistics.stdev(serial_samples):.6f}", "speedup": "1.000000",
                     "efficiency": "1.000000", "cost_ms": f"{serial_median:.6f}", "overhead_ms": "0.000000"})
        for threads in THREAD_COUNTS:
            samples = measure([str(openmp), str(limit), str(threads), "0", str(TIMING_REPETITIONS)], limit)
            median = statistics.median(samples)
            speedup = serial_median / median
            for repeat, elapsed in enumerate(samples, 1):
                rows.append({"record_type": "raw", "limit": limit, "algorithm": "openmp", "threads": threads,
                             "repeat": repeat, "time_ms": f"{elapsed:.6f}", "median_ms": "", "stddev_ms": "",
                             "speedup": "", "efficiency": "", "cost_ms": "", "overhead_ms": ""})
            rows.append({"record_type": "summary", "limit": limit, "algorithm": "openmp", "threads": threads,
                         "repeat": "", "time_ms": "", "median_ms": f"{median:.6f}",
                         "stddev_ms": f"{statistics.stdev(samples):.6f}", "speedup": f"{speedup:.6f}",
                         "efficiency": f"{speedup / threads:.6f}", "cost_ms": f"{threads * median:.6f}",
                         "overhead_ms": f"{threads * median - serial_median:.6f}"})

    output = Path(__file__).with_name("scalability_results.csv")
    with output.open("w", newline="", encoding="ascii") as file:
        writer = csv.DictWriter(file, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    metadata = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "processor": platform.processor(),
        "logical_cpu_count": os.cpu_count(),
        "compiler": subprocess.run(["g++", "--version"], capture_output=True, text=True, check=False).stdout.splitlines()[0],
        "optimization_flags": "-O2 -Wall -Wextra -std=c++17; OpenMP additionally uses -fopenmp",
        "timer": "serial: std::chrono::high_resolution_clock; OpenMP: omp_get_wtime; output printing excluded",
        "limits": LIMITS,
        "thread_counts": THREAD_COUNTS,
        "warmups_per_configuration": 1,
        "measured_repetitions": REPETITIONS,
        "in_program_timing_repetitions": TIMING_REPETITIONS,
    }
    Path(__file__).with_name("scalability_metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="ascii"
    )
    print(f"Wrote {output.name} and scalability_metadata.json using median of {REPETITIONS} measured runs")


if __name__ == "__main__":
    main()
