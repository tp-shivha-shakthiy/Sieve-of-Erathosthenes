# Parallel Sieve of Eratosthenes

> The active API-facing implementation is `cpp/`. For the current reproducible test procedure, measured benchmark table, and complete PADC concept coverage, see [`docs/PADC_ANALYSIS.md`](docs/PADC_ANALYSIS.md).

## 1. Objective and Description

The objective is to compute all prime numbers up to an upper bound `n` and compare a sequential C++ implementation against a shared-memory OpenMP implementation. The project studies whether a regular, memory-intensive scientific-style computation benefits from multicore execution.

**What:** the Sieve of Eratosthenes repeatedly marks multiples of each prime as composite.

**Why:** prime generation has a known correct sequential baseline, clear data dependencies, predictable memory access, and enough work at large `n` to study speedup, efficiency, overhead, and scalability.

**Where:** the workload represents regular-grid applications in scientific computing: an indexed domain is partitioned into contiguous regions. Unlike irregular workloads, each region has a predictable layout, though the number of multiples marked per prime is non-uniform.

The project runs on a shared-memory multi-core CPU. It intentionally does not claim GPU or MPI implementation: those are separately designed extensions described below.

## 2. Algorithm and Pseudocode

### Serial algorithm

```text
SERIAL-SIEVE(n)
  is_prime[0..n] <- true; is_prime[0] <- is_prime[1] <- false
  for p <- 2 to floor(sqrt(n))
    if is_prime[p]
      for multiple <- p*p to n step p
        is_prime[multiple] <- false
  count entries i in [2, n] where is_prime[i] is true
```

### OpenMP algorithm using Ian Foster's PCAM method

```text
OPENMP-SEGMENTED-SIEVE(n, threads)
  base_primes <- SERIAL-SIEVE(floor(sqrt(n)))
  partition [2, n] into fixed-size contiguous blocks
  #pragma omp parallel reduction(+:prime_count)
    #pragma omp single
      record observed team size
    #pragma omp for schedule(static)
  for every block assigned to a worker
    for every p in shared read-only base_primes
      mark multiples of p that fall inside this block
    count unmarked values in this block into private local_count
    contribute local_count to prime_count
```

## 3. Foster PCAM Design

| PCAM phase | Design decision | Rationale |
| --- | --- | --- |
| Partitioning | Divide the regular number domain `[2, n]` into 32,768-element blocks. | Each block has an independent output region and can be sized for cache locality. |
| Communication | Build `base_primes` up to `sqrt(n)` once, then share it read-only. | Workers need the same small set of prime factors; no worker-to-worker composite updates are needed. |
| Agglomeration | Keep marking and counting for one block together in the same iteration. | Avoids fine-grained tasks and combines enough work to amortize OpenMP scheduling overhead. |
| Mapping | Use `omp for schedule(static)` inside an OpenMP parallel region over blocks. | Blocks have equal size, static mapping is reproducible, and each thread writes only its assigned ranges. |

This replaces a factor-based mapping, where several threads can mark the same composite. The current range ownership has no concurrent writes to an element, so it is valid C++ memory behavior without atomics. The implicit barriers after `single` and `for` establish phase ordering before JSON output. `base_primes` and `is_prime` are shared; loop indices, block bounds, and `local_count` are private; `prime_count` uses an OpenMP reduction.

## 4. OpenMP Concepts Demonstrated

- **Execution model:** a master thread prepares base primes, forks a team for the parallel loop, then joins at the implicit barrier.
- **Directives:** `#pragma omp parallel`, `#pragma omp single`, `#pragma omp for schedule(static)`, and `reduction(+:prime_count)`.
- **Data scoping:** shared read-only base-prime list and disjoint shared output array; private loop/block variables; reduction accumulator.
- **Synchronization:** no explicit lock, critical section, or atomic operation is necessary because blocks do not overlap. The worksharing loop has an implicit barrier.
- **Run-time library:** `omp_set_num_threads` selects the requested team size. Thread count is validated from 1 to 64.
- **Scheduling study:** static scheduling is the production choice because output blocks are equal-sized. A `dynamic` schedule is a useful comparison experiment, but may add overhead and reduce reproducibility.

## 5. Demonstration Cases

Use these known results to demonstrate serial/OpenMP correctness before presenting timing data. Run each in both modes; prime counts must match.

| Upper bound n | Expected prime count pi(n) | Purpose |
| --- | ---: | --- |
| 30 | 10 | Small visual correctness case: `2, 3, 5, 7, 11, 13, 17, 19, 23, 29` |
| 100,000 | 9,592 | Medium correctness and timing case |
| 1,000,000 | 78,498 | Large interactive demonstration case |
| 10,000,000 | 664,579 | Scalability experiment input |

The web UI can show the first two small prime lists and reports the serial/OpenMP elapsed time and speedup. For timing evidence, do not use a single UI run as a conclusion; use the repeatable benchmark below.

## 6. Complexity and Performance Analysis

The serial Sieve of Eratosthenes performs `O(n log log n)` marking work and uses `O(n)` memory. The OpenMP implementation has the same asymptotic total work and `O(n + sqrt(n))` memory. Ideal parallel time is approximately `T1 / p`, but actual time includes base-prime creation, memory bandwidth limits, OpenMP startup/synchronization, cache effects, and load imbalance.

For each configuration, report:

```text
speedup S(p) = T_serial / T_openmp(p)
efficiency E(p) = S(p) / p
```

Run the controlled experiment after building:

```powershell
python benchmarks/run_scalability.py
```

It performs one warm-up and seven measured repetitions for `n = 100,000`, `1,000,000`, and `10,000,000`, with 1, 2, 4, and 8 OpenMP threads. It checks known prime counts and writes canonical median-time CSV, raw trials, derived metrics, and machine metadata to `results/`. Include the generated bundle in the final submission, and state compiler, optimization flags, CPU model, logical cores, OS, and whether other workloads were running.

## 7. Architecture and Scope

### Multi-core and many-core CPU

The implemented target is a cache-coherent multicore shared-memory machine. Speedup is expected only while useful work per thread is sufficiently large and memory bandwidth is not saturated. At small input sizes, OpenMP overhead can make the serial implementation faster.

### SIMD/vectorization and GPU accelerators

The composite-marking loop has regular strides for an individual prime but varying strides across primes. Auto-vectorization should be inspected with compiler vectorization reports before claiming SIMD gains. A GPU version would map blocks to thread blocks, place base primes in read-only/constant memory, and use a device-side segmented sieve. Host-device transfer, global-memory coalescing, and kernel-launch overhead must be measured separately. This repository does **not** claim an accelerator implementation.

### MPI distributed-memory extension

An MPI version can partition `[2, n]` among ranks using the same PCAM partitioning. Rank 0 can generate base primes and distribute them with `MPI_Bcast`; each rank marks its local segment; `MPI_Reduce` sums local counts. Non-blocking `MPI_Ibcast`/`MPI_Ireduce` can overlap communication with setup where supported. A one-dimensional Cartesian topology maps naturally to contiguous numeric ranges. MPI-IO can write per-rank result ranges to one file. One-sided communication is unnecessary for this regular read-only base-prime communication pattern and should not be added without a measured reason. This is a design extension, not an implemented feature.

## 8. Performance-Tool Plan

Use a measurement plan before optimization:

| Question | Evidence/tool |
| --- | --- |
| Is CPU time spent in marking or elsewhere? | Function/instruction profiling with compiler tools, `perf`, or Visual Studio Profiler. |
| Are all threads active and balanced? | OpenMP runtime timings; trace with Score-P/Scalasca where available. |
| Is speedup limited by cache or memory bandwidth? | Hardware-counter profiling (cache misses, bandwidth, cycles) and a roofline-style discussion. |
| What is the time ordering of parallel events? | Event trace/timeline, not only aggregate profiling. |
| Does an optimization reliably help? | Repeat the same benchmark, compare the canonical median and standard deviation, and retain only reproducible improvements. |
| Does energy change with thread count? | Energy Analyzer or platform energy counters if the laboratory provides them. |

MPI-P, Score-P, Scalasca, and Periscope are appropriate for the proposed MPI extension or a supported lab environment; do not fabricate output from tools that were not run.

## 9. Build and Run

On this Windows development machine, the included MinGW toolchain can build the C++ programs without CMake:

```powershell
cd cpp
mingw32-make
```

This produces `backend/bin/sieve_serial.exe` and `backend/bin/sieve_openmp.exe`. The API validates limits from 2 to 100,000,000 and threads from 1 to 64. Use `build.bat` for the complete application setup when CMake or a direct `g++` toolchain is available.

## 10. Limitations and Honest Conclusions

- The current program is shared-memory OpenMP only; MPI, GPU, SIMD intrinsics, parallel I/O, and energy profiling are documented extensions, not completed claims.
- Timing includes allocation, marking, and counting. Serial and OpenMP now use the same byte-per-entry representation for a fairer comparison.
- Report negative speedup at small inputs honestly. It demonstrates parallel overhead and supports the scalability discussion.
- Results are hardware-dependent. A strict conclusion requires the generated repeated-run data, not a screenshot of one run.
