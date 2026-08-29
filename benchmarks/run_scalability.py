"""Run repeatable serial and OpenMP scaling measurements for the project report."""

import csv
import json
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


def measure(command: list[str], limit: int) -> tuple[float, float]:
    run(command, limit)  # Warm-up prevents one-time startup effects from dominating.
    samples = [run(command, limit) for _ in range(REPETITIONS)]
    return statistics.mean(samples), statistics.stdev(samples)


def main() -> None:
    serial = binary("sieve_serial")
    openmp = binary("sieve_openmp")
    rows: list[dict[str, object]] = []

    for limit in LIMITS:
        serial_mean, serial_stddev = measure([str(serial), str(limit), "0"], limit)
        rows.append({
            "limit": limit, "algorithm": "serial", "threads": 1,
            "mean_ms": f"{serial_mean:.4f}", "stddev_ms": f"{serial_stddev:.4f}",
            "speedup": "1.0000", "efficiency": "1.0000",
        })
        for threads in THREAD_COUNTS:
            mean, stddev = measure([str(openmp), str(limit), str(threads), "0"], limit)
            speedup = serial_mean / mean
            rows.append({
                "limit": limit, "algorithm": "openmp", "threads": threads,
                "mean_ms": f"{mean:.4f}", "stddev_ms": f"{stddev:.4f}",
                "speedup": f"{speedup:.4f}", "efficiency": f"{speedup / threads:.4f}",
            })

    output = Path(__file__).with_name("scalability_results.csv")
    with output.open("w", newline="", encoding="ascii") as file:
        writer = csv.DictWriter(file, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    metadata = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "platform": platform.platform(),
        "processor": platform.processor(),
        "logical_cpu_count": __import__("os").cpu_count(),
        "limits": LIMITS,
        "thread_counts": THREAD_COUNTS,
        "warmups_per_configuration": 1,
        "measured_repetitions": REPETITIONS,
    }
    Path(__file__).with_name("scalability_metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="ascii"
    )
    print(f"Wrote {output.name} and scalability_metadata.json")


if __name__ == "__main__":
    main()
