# Sieve of Eratosthenes

A web interface for comparing serial and OpenMP implementations of the Sieve of Eratosthenes.

## Features

- C++ serial and OpenMP sieve implementations
- FastAPI backend that executes the native binaries and returns JSON results
- React observability dashboard with configurable limits, thread counts, charts, prime visualization, and JSON inspection
- Run Context panel with current settings, run validation, actual in-session history, and machine capability data

## Project Structure

```text
cpp/                 C++ serial and OpenMP implementations
backend/             FastAPI service and compiled binaries
frontend/            Vite React frontend
benchmarks/          Repeatable scalability benchmark runner
build.bat, build.sh  Build helpers
start.bat, start.sh  Launch helpers
```

## Prerequisites

- Python 3.9 or later
- Node.js and npm
- MinGW `g++` with OpenMP support

## Run on Windows

From the repository root in PowerShell, install the API and frontend dependencies:

```powershell
python -m pip install -r backend\requirements.txt
npm --prefix frontend ci
```

Build the native sieve executables:

```powershell
g++ -O2 -std=c++17 -o backend\bin\sieve_serial.exe cpp\sieve_serial.cpp
g++ -O2 -std=c++17 -fopenmp -o backend\bin\sieve_openmp.exe cpp\sieve_openmp.cpp
```

Start both services:

```powershell
.\start.bat
```

Open http://127.0.0.1:5173 in a browser. The API health endpoint is http://127.0.0.1:8000/health.

After changing a backend file, close the Backend console window and rerun `start.bat`, or use the reload command in [Development Commands](#development-commands).

## Verify the API

With the backend running:

```powershell
$body = @{ limit = 100000; algorithm = "both"; num_threads = 4; return_primes = $false } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:8000/sieve" -Method Post -ContentType "application/json" -Body $body
```

Both results should report a `prime_count` of `9592`.

## API

`GET /health` returns `{"status":"ok"}`.

`GET /system` returns real runtime capability data used by the Run Context panel: logical CPU count, processor architecture, whether the OpenMP executable is available, and the installed `g++` version when it can be detected.

`POST /sieve` accepts:

```json
{
  "limit": 100000,
  "algorithm": "both",
  "num_threads": 4,
  "return_primes": false
}
```

`algorithm` must be `serial`, `openmp`, or `both`. The API accepts limits from 2 through 100,000,000. For `both`, the serial result is the `1.0` speedup baseline and the OpenMP result reports `serial_time / openmp_time`.

## Development Commands

```powershell
# Rebuild after changing cpp/sieve_serial.cpp or cpp/sieve_openmp.cpp
g++ -O2 -std=c++17 -o backend\bin\sieve_serial.exe cpp\sieve_serial.cpp
g++ -O2 -std=c++17 -fopenmp -o backend\bin\sieve_openmp.exe cpp\sieve_openmp.cpp

# Run services separately
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
npm --prefix frontend run dev -- --host 127.0.0.1
```

The frontend proxies `/api/*` requests to the backend. For example, `http://127.0.0.1:5173/api/system` returns the same metadata as `http://127.0.0.1:8000/system`.
