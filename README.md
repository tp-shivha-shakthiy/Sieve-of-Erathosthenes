# Sieve of Eratosthenes — Serial vs OpenMP Benchmark

A full-stack application that benchmarks the **Sieve of Eratosthenes** implemented in
C++, comparing a **serial** version against an **OpenMP-parallelized** version, with
interactive visualization in a React frontend.

```
┌──────────────────┐
│   React Frontend  │  Vite + Recharts (charts & visualizations)
└────────┬─────────┘
         │         HTTP / API
┌────────▼─────────┐
│   FastAPI Backend │  Spawns C++ binaries, parses JSON output
└────────┬─────────┘
 ┌───────┴────────┐
 Serial C++       OpenMP C++
 └───────┬────────┘
         │         Results JSON
┌────────▼─────────┐
│  Visualization   │
│   + Charts       │
└──────────────────┘
```

## Features

- **Two C++ implementations** of the sieve
  - Serial (`sieve_serial.cpp`)
  - Parallel with OpenMP (`sieve_openmp.cpp`) using a stripe-based design
- **FastAPI backend** that runs the C++ binaries as subprocesses and returns structured JSON
- **React frontend** with:
  - Configurable upper limit (with presets up to 100M)
  - Algorithm selection and OpenMP thread count
  - Execution-time bar chart
  - Speedup-factor chart
  - Visual prime-number grid
  - Raw JSON output for inspection

## Project Structure

```
Sieve-of-Erathosthenes/
├── cpp/
│   ├── sieve_serial.cpp        # Serial implementation
│   ├── sieve_openmp.cpp        # OpenMP implementation
│   ├── CMakeLists.txt          # CMake build (copies binaries to backend/bin)
│   └── Makefile                # Alternative Make build
├── backend/
│   ├── main.py                 # FastAPI app (POST /sieve, GET /health)
│   ├── requirements.txt
│   └── bin/                    # Compiled binaries (created by build)
├── frontend/
│   ├── src/
│   │   ├── App.tsx             # Main app + state
│   │   └── components/
│   │       ├── SieveControls.tsx
│   │       ├── PerformanceChart.tsx
│   │       ├── SpeedupChart.tsx
│   │       └── PrimeGrid.tsx
│   ├── package.json
│   ├── vite.config.ts          # /api proxy → :8000
│   └── index.html
├── build.bat / build.sh        # Build everything (C++ + deps)
├── start.bat / start.sh        # Launch backend + frontend
└── .gitignore
```

## Prerequisites

- **C++ compiler** with OpenMP support (e.g. GCC/g++ with `-fopenmp`, or MSVC)
- **CMake** (optional — falls back to g++ if not found)
- **Python 3.9+** with `pip`
- **Node.js 18+** with `npm`

## Build

```bash
# Windows
.\build.bat

# macOS / Linux
./build.sh
```

This compiles both C++ binaries into `backend/bin/`, and installs the Python and
Node dependencies.

## Run

```bash
# Windows
.\start.bat

# macOS / Linux
./start.sh
```

- Backend: **http://localhost:8000**
- Frontend: **http://localhost:5173**

Open the frontend, choose a limit and algorithm, then click **Run Sieve**.

## API

### `GET /health`
Returns `{"status": "ok"}`.

### `POST /sieve`
Body:
```json
{
  "limit": 10000000,
  "algorithm": "both",        // "serial" | "openmp" | "both"
  "num_threads": 4,           // OpenMP thread count
  "return_primes": false      // include the primes array
}
```

Response:
```json
{
  "results": [
    {
      "algorithm": "serial",
      "limit": 10000000,
      "prime_count": 664579,
      "execution_time_ms": 35.1,
      "primes": [],
      "speedup": 1.75
    },
    {
      "algorithm": "openmp",
      "limit": 10000000,
      "num_threads": 4,
      "prime_count": 664579,
      "execution_time_ms": 20.1,
      "speedup": 1.0
    }
  ],
  "parameters": { "...": "..." }
}
```

For `"algorithm": "both"`, the serial result's `speedup` equals
`serial_time / openmp_time`.

## Notes

- **Custom limits**: the backend accepts any limit from 2 up to 100,000,000.
- **Prime array**: returned only when `return_primes` is `true` and `limit ≤ 1,000,000`
  (to keep responses small).
- **Verification**: both implementations produce identical prime counts
  (e.g. 25 ≤ 100, 664,579 ≤ 10M, 5,761,455 ≤ 100M).
