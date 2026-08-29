"""Produce raw and summarized benchmark evidence from the submission executables."""

import csv
import os
import platform
import re
import statistics
import subprocess
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BIN = ROOT / "bin"
LIMITS = (100_000, 1_000_000, 10_000_000)
THREADS = (1, 2, 4, 8)
REPETITIONS = 5
EXPECTED = {100_000: 9_592, 1_000_000: 78_498, 10_000_000: 664_579}
RESULT = re.compile(r"^RESULT,(serial|openmp),(\d+),(\d+),(\d+),(\d+(?:\.\d+)?)$")


def executable(name: str) -> Path:
    path = BIN / f"{name}.exe"
    if not path.is_file():
        raise FileNotFoundError(f"Build missing: {path}")
    return path


def one_run(command: list[str], limit: int) -> float:
    completed = subprocess.run(command, check=True, capture_output=True, text=True)
    match = RESULT.match(completed.stdout.strip())
    if not match:
        raise RuntimeError(f"Unexpected output: {completed.stdout!r}")
    if int(match.group(4)) != EXPECTED[limit]:
        raise RuntimeError(f"Incorrect prime count for n={limit}: {match.group(4)}")
    return float(match.group(5))


def sample(command: list[str], limit: int) -> list[float]:
    one_run(command, limit)  # Unmeasured warm-up.
    return [one_run(command, limit) for _ in range(REPETITIONS)]


def physical_cpu_count() -> str:
    if os.name != "nt":
        return "unavailable on this platform"
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-Command", "(Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfCores -Sum).Sum"],
        capture_output=True, text=True, check=False,
    )
    return completed.stdout.strip() if completed.returncode == 0 else "unavailable"


def main() -> None:
    serial = executable("serial_sieve")
    openmp = executable("openmp_sieve")
    rows: list[dict[str, object]] = []
    summaries: dict[tuple[int, int], float] = {}
    for limit in LIMITS:
        serial_samples = sample([str(serial), str(limit), "--quiet"], limit)
        serial_mean = statistics.mean(serial_samples)
        summaries[(limit, 1)] = serial_mean
        for repeat, elapsed in enumerate(serial_samples, 1):
            rows.append({"record_type": "raw", "n": limit, "mode": "serial", "threads": 1,
                         "repeat": repeat, "time_ms": f"{elapsed:.6f}", "mean_ms": "", "stddev_ms": "",
                         "speedup": "", "efficiency": "", "cost_ms": "", "overhead_ms": ""})
        rows.append({"record_type": "summary", "n": limit, "mode": "serial", "threads": 1,
                     "repeat": "", "time_ms": "", "mean_ms": f"{serial_mean:.6f}",
                     "stddev_ms": f"{statistics.stdev(serial_samples):.6f}", "speedup": "1.000000",
                     "efficiency": "1.000000", "cost_ms": f"{serial_mean:.6f}", "overhead_ms": "0.000000"})
        for threads in THREADS:
            samples = sample([str(openmp), str(limit), str(threads), "--quiet"], limit)
            mean = statistics.mean(samples)
            speedup = serial_mean / mean
            for repeat, elapsed in enumerate(samples, 1):
                rows.append({"record_type": "raw", "n": limit, "mode": "openmp", "threads": threads,
                             "repeat": repeat, "time_ms": f"{elapsed:.6f}", "mean_ms": "", "stddev_ms": "",
                             "speedup": "", "efficiency": "", "cost_ms": "", "overhead_ms": ""})
            rows.append({"record_type": "summary", "n": limit, "mode": "openmp", "threads": threads,
                         "repeat": "", "time_ms": "", "mean_ms": f"{mean:.6f}",
                         "stddev_ms": f"{statistics.stdev(samples):.6f}", "speedup": f"{speedup:.6f}",
                         "efficiency": f"{speedup / threads:.6f}", "cost_ms": f"{threads * mean:.6f}",
                         "overhead_ms": f"{threads * mean - serial_mean:.6f}"})
    with (ROOT / "benchmark_results.csv").open("w", newline="", encoding="ascii") as output:
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    metadata = [
        f"Timestamp UTC: {datetime.now(timezone.utc).isoformat()}",
        f"Platform: {platform.platform()}",
        f"Processor: {platform.processor()}",
        f"Physical CPU core count: {physical_cpu_count()}",
        f"Logical CPU count: {os.cpu_count()}",
        "Compiler: g++ (run g++ --version for exact version)",
        "Build flags: -O2 -Wall -Wextra -std=c++17; OpenMP additionally uses -fopenmp",
        "Timer: omp_get_wtime() (monotonic wall-clock timer)",
        "Block size: 32768 entries",
        "Warm-ups per configuration: 1",
        f"Measured repetitions per configuration: {REPETITIONS}",
        "In-program timing repetitions per reported sample: 10",
        f"Limits: {', '.join(str(value) for value in LIMITS)}",
        f"Requested OpenMP threads: {', '.join(str(value) for value in THREADS)}",
    ]
    (ROOT / "benchmark_metadata.txt").write_text("\n".join(metadata) + "\n", encoding="ascii")
    print("Wrote benchmark_results.csv and benchmark_metadata.txt")


if __name__ == "__main__":
    main()
