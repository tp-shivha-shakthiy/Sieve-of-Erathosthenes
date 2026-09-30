"""Standard-library correctness checks for the active serial and OpenMP executables."""

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from backend.main import BENCHMARK_SAMPLES, SieveRequest, run_benchmark

BIN = ROOT / "backend" / "bin"
EXT = ".exe" if sys.platform == "win32" else ""
SERIAL = BIN / f"sieve_serial{EXT}"
OPENMP = BIN / f"sieve_openmp{EXT}"
EXPECTED = {2: 1, 3: 2, 4: 2, 10: 4, 30: 10, 100: 25, 100_000: 9_592, 1_000_000: 78_498, 10_000_000: 664_579, 100_000_000: 5_761_455}
PRIMES_30 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]


def invoke(command: list[str]) -> dict[str, object]:
    completed = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(completed.stdout)


def expect_invalid(command: list[str]) -> None:
    completed = subprocess.run(command, capture_output=True, text=True)
    assert completed.returncode != 0, f"expected failure: {command}"


def block_ranges(limit: int, block_size: int = 32_768) -> list[tuple[int, int]]:
    return [(low, min(limit, low + block_size - 1)) for low in range(2, limit + 1, block_size)]


def verify_block_partition(limit: int) -> None:
    ranges = block_ranges(limit)
    covered = [value for low, high in ranges for value in range(low, high + 1)]
    assert covered == list(range(2, limit + 1)), (limit, ranges)


def main() -> None:
    assert SERIAL.is_file() and OPENMP.is_file(), "Build the C++ binaries before testing."
    expect_invalid([str(SERIAL), "1"])
    expect_invalid([str(OPENMP), "1", "4"])
    for limit in (2, 3, 4, 10, 30, 100, 100_000, 1_000_000, 10_000_000):
        verify_block_partition(limit)

    for limit, count in EXPECTED.items():
        serial = invoke([str(SERIAL), str(limit), "1"])
        assert serial["prime_count"] == count, (limit, serial)
        for threads in (1, 2, 4, 8):
            parallel = invoke([str(OPENMP), str(limit), str(threads), "1"])
            assert parallel["prime_count"] == count, (limit, threads, parallel)
            assert parallel["actual_threads"] == threads, (limit, threads, parallel)
            if limit <= 1_000_000:
                assert parallel["primes"] == serial["primes"], (limit, threads)
        if limit == 30:
            assert serial["primes"] == PRIMES_30, serial

    # Regression: the OpenMP binary must support configurable block size and schedule while preserving defaults.
    block_size_check = invoke([str(OPENMP), "100000", "4", "0", "1", "10000"])
    assert block_size_check["prime_count"] == EXPECTED[100_000], block_size_check
    assert block_size_check["actual_threads"] == 4, block_size_check

    schedule_check = invoke([str(OPENMP), "100000000", "4", "0", "1", "10000", "dynamic"])
    assert schedule_check["prime_count"] == EXPECTED[100_000_000], schedule_check
    assert schedule_check["actual_threads"] == 4, schedule_check

    naive_check = invoke([str(OPENMP), "100000000", "4", "0", "1", "10000", "static", "naive"])
    assert naive_check["prime_count"] == EXPECTED[100_000_000], naive_check
    assert naive_check["actual_threads"] == 4, naive_check

    small_benchmark = run_benchmark(SieveRequest(limit=100_000, algorithm="both", num_threads=4))
    benchmark_serial, benchmark_openmp = small_benchmark["results"]
    assert small_benchmark["measurement"]["samples"] == BENCHMARK_SAMPLES
    assert small_benchmark["measurement"]["timing_repetitions"] >= 20
    assert benchmark_serial["execution_time_ms"] > 0
    assert benchmark_openmp["execution_time_ms"] > 0
    assert benchmark_serial["average_per_run_ms"] == benchmark_serial["execution_time_ms"]
    assert benchmark_openmp["average_per_run_ms"] == benchmark_openmp["execution_time_ms"]
    assert benchmark_openmp["speedup"] == benchmark_serial["execution_time_ms"] / benchmark_openmp["execution_time_ms"]
    assert benchmark_openmp["efficiency"] == benchmark_openmp["speedup"] / benchmark_openmp["actual_threads"]

    print("PASS: serial/OpenMP edge, known-count, block partition, prime-list, and small benchmark checks")


if __name__ == "__main__":
    main()
