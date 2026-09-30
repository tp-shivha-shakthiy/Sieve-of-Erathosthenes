import csv
import json
import statistics
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESULTS_DIR = ROOT / "results"
RESULTS_DIR.mkdir(exist_ok=True)

LIMIT = 100_000_000
BLOCK_SIZE = 10_000
THREADS = (1, 2, 4, 8)
TRIALS = 5
EXPECTED = 5_761_455

SERIAL_BIN = ROOT / "backend/bin/sieve_serial_experiment.exe"
OPENMP_BIN = ROOT / "backend/bin/sieve_openmp_experiment.exe"


def run(cmd: list[str]) -> dict:
    completed = subprocess.run(cmd, capture_output=True, text=True, check=True)
    payload = json.loads(completed.stdout)
    if payload["prime_count"] != EXPECTED:
        raise RuntimeError(f"Wrong prime count for {cmd}: {payload}")
    return payload


def median_ms(samples: list[dict]) -> float:
    return statistics.median(float(sample["execution_time_ms"]) for sample in samples)


def main() -> None:
    # Build the comparison binaries into fresh output names to avoid stale Windows locks.
    serial_src = ROOT / "cpp/sieve_serial.cpp"
    openmp_src = ROOT / "cpp/sieve_openmp.cpp"
    subprocess.run([
        "g++", "-O2", "-Wall", "-Wextra", "-std=c++17", "-fopenmp",
        str(serial_src), "-o", str(SERIAL_BIN),
    ], check=True)
    subprocess.run([
        "g++", "-O2", "-Wall", "-Wextra", "-std=c++17", "-fopenmp",
        str(openmp_src), "-o", str(OPENMP_BIN),
    ], check=True)

    serial_samples = [run([str(SERIAL_BIN), str(LIMIT), "0", "20"]) for _ in range(TRIALS)]
    serial_median = median_ms(serial_samples)
    rows = [{
        "strategy": "serial",
        "threads": 1,
        "block_size": BLOCK_SIZE,
        "prime_count": EXPECTED,
        "median_execution_time_ms": round(serial_median, 6),
        "same_strategy_speedup": 1.0,
        "same_strategy_efficiency": 1.0,
        "serial_vs_parallel_speedup": 1.0,
        "trial_count": TRIALS,
    }]

    for strategy_name, strategy_label in (("naive_openmp", "naive"), ("block_openmp", "block")):
        per_thread: dict[int, list[dict]] = {}
        for threads in THREADS:
            samples = [
                run([str(OPENMP_BIN), str(LIMIT), str(threads), "0", "20", str(BLOCK_SIZE), "static", strategy_label])
                for _ in range(TRIALS)
            ]
            per_thread[threads] = samples

        baseline = median_ms(per_thread[1])
        for threads in THREADS:
            samples = per_thread[threads]
            median = median_ms(samples)
            speedup = baseline / median if median > 0 else 0.0
            efficiency = speedup / threads if threads > 0 else 0.0
            serial_speedup = serial_median / median if median > 0 else 0.0
            rows.append({
                "strategy": strategy_name,
                "threads": threads,
                "block_size": BLOCK_SIZE,
                "prime_count": EXPECTED,
                "median_execution_time_ms": round(median, 6),
                "same_strategy_speedup": round(speedup, 6),
                "same_strategy_efficiency": round(efficiency, 6),
                "serial_vs_parallel_speedup": round(serial_speedup, 6),
                "trial_count": TRIALS,
            })

    csv_path = RESULTS_DIR / "parallel_strategy_comparison.csv"
    with csv_path.open("w", newline="", encoding="ascii") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "strategy",
                "threads",
                "block_size",
                "prime_count",
                "median_execution_time_ms",
                "same_strategy_speedup",
                "same_strategy_efficiency",
                "serial_vs_parallel_speedup",
                "trial_count",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

    (RESULTS_DIR / "parallel_strategy_comparison.json").write_text(json.dumps(rows, indent=2), encoding="ascii")
    print(json.dumps(rows, indent=2))


if __name__ == "__main__":
    main()
