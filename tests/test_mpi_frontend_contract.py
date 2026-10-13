"""Contract tests for the browser MPI replay and rank-0 benchmark JSON."""

import json


def partition(limit: int, process_count: int) -> list[tuple[int, int]]:
    candidate_count = limit - 1
    quotient, remainder = divmod(candidate_count, process_count)
    ranges = []
    for rank in range(process_count):
        workload = quotient + (rank < remainder)
        offset = rank * quotient + min(rank, remainder)
        low = 2 + offset
        ranges.append((low, low + workload - 1 if workload else low - 1))
    return ranges


def prime_count(limit: int) -> int:
    flags = [True] * (limit + 1)
    flags[0:2] = [False, False]
    for number in range(2, int(limit**0.5) + 1):
        if flags[number]:
            for multiple in range(number * number, limit + 1, number):
                flags[multiple] = False
    return sum(flags)


def parse_mpi_json(text: str) -> dict:
    record = json.loads(text)
    assert record["algorithm"] == "mpi"
    assert record["limit"] >= 2
    assert record["prime_count"] >= 0
    assert record["execution_time_ms"] > 0
    assert record["num_processes"] >= 1
    return record


def test_uneven_partition_covers_each_candidate_once() -> None:
    ranges = partition(30, 4)
    assert ranges == [(2, 9), (10, 16), (17, 23), (24, 30)]
    covered = [number for low, high in ranges for number in range(low, high + 1)]
    assert covered == list(range(2, 31))


def test_empty_ranks_and_known_counts() -> None:
    ranges = partition(2, 4)
    assert ranges == [(2, 2), (3, 2), (3, 2), (3, 2)]
    assert prime_count(10) == 4
    assert prime_count(30) == 10
    assert prime_count(100) == 25


def test_rank_zero_json_contract_and_rejects_non_mpi() -> None:
    record = parse_mpi_json(
        '{"algorithm":"mpi","limit":30,"num_processes":4,'
        '"prime_count":10,"execution_time_ms":0.42}'
    )
    assert record["prime_count"] == 10

    try:
        parse_mpi_json('{"algorithm":"openmp","limit":30}')
    except (AssertionError, KeyError):
        pass
    else:
        raise AssertionError("non-MPI benchmark JSON must not be accepted")