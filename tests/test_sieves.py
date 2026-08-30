"""Standard-library correctness checks for the active serial and OpenMP executables."""

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BIN = ROOT / "backend" / "bin"
EXT = ".exe" if sys.platform == "win32" else ""
SERIAL = BIN / f"sieve_serial{EXT}"
OPENMP = BIN / f"sieve_openmp{EXT}"
EXPECTED = {2: 1, 3: 2, 30: 10, 100: 25, 1_000_000: 78_498}
PRIMES_30 = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]


def invoke(command: list[str]) -> dict[str, object]:
    completed = subprocess.run(command, capture_output=True, text=True, check=True)
    return json.loads(completed.stdout)


def expect_invalid(command: list[str]) -> None:
    completed = subprocess.run(command, capture_output=True, text=True)
    assert completed.returncode != 0, f"expected failure: {command}"


def main() -> None:
    assert SERIAL.is_file() and OPENMP.is_file(), "Build the C++ binaries before testing."
    expect_invalid([str(SERIAL), "1"])
    expect_invalid([str(OPENMP), "1", "4"])

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

    print("PASS: serial/OpenMP edge, known-count, and prime-list checks")


if __name__ == "__main__":
    main()
