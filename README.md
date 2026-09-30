# RSA Cryptography Demonstrator

An interactive, educational web application and High-Performance Parallel Computing (PDC) lab demonstrating the complete RSA cryptographic lifecycle powered by real C++ Serial & OpenMP Parallel Sieve of Eratosthenes prime generation.

## Features

- **Stage 1 — Prime Generation**: Native C++ Serial and OpenMP Parallel Sieve of Eratosthenes with real execution times, speedup calculation ($S = T_{serial} / T_{parallel}$), and candidate elimination step visualizer.
- **Stage 2 — RSA Key Generation**: Interactive selection of primes $p$ and $q$, step-by-step calculation of modulus $n = p \times q$, Euler's totient $\varphi(n) = (p-1)(q-1)$, coprime public exponent $e$, and modular inverse private exponent $d = e^{-1} \pmod{\varphi(n)}$ via the Extended Euclidean Algorithm.
- **Stage 3 — Message Encryption**: Plaintext blocking ($M < n$) and public-key modular exponentiation $C = M^e \pmod n$ with complete substituted values.
- **Stage 4 — Message Decryption**: Private-key modular exponentiation $M = C^d \pmod n$, block decoding, and verified plaintext recovery with integrity checks.
- **Stage 5 — Workflow Summary**: End-to-end interconnected pipeline tracking state transitions from prime generation to recovered message.
- **Dedicated Views**:
  - **PDC Performance Lab**: Thread scaling charts, Amdahl's law insights, and hardware CPU/OpenMP specs.
  - **Interactive Visualizations**: Animated Sieve grid step-through and full RSA data flow visualizer.
  - **Educational Guide (About RSA)**: Mathematical proofs, Euler's totient theorem, factoring hardness, and educational vs production RSA disclaimer.

## Project Structure

```text
cpp/                 C++ serial and OpenMP implementations
backend/             FastAPI service and compiled binaries
frontend/            Vite + React + TypeScript + Recharts + Lucide Icons frontend
benchmarks/          Repeatable scalability benchmark runner
tests/               Serial/OpenMP and RSA correctness test suites
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
g++ -O2 -Wall -Wextra -std=c++17 -o backend\bin\sieve_serial.exe cpp\sieve_serial.cpp
g++ -O2 -Wall -Wextra -std=c++17 -fopenmp -o backend\bin\sieve_openmp.exe cpp\sieve_openmp.cpp
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

## Deployment (Render)

This full stack is deployed on [Render](https://render.com) via the `render.yaml`
Blueprint — Vercel/static-only hosts can't run the C++ subprocesses, so Render's
Docker web service is used for the backend.

### Live links

- Frontend: https://sieve-frontend-0uou.onrender.com
- Backend: https://sieve-backend-jcau.onrender.com
- Health check: https://sieve-backend-jcau.onrender.com/health

### Architecture on Render

- `sieve-backend` — Docker web service (`backend/Dockerfile`). The multi-stage build
  compiles both C++ binaries with `g++` + OpenMP (`-fopenmp`) in a `gcc:14` stage,
  then runs FastAPI on a slim Python image. `libgomp1` is installed so the OpenMP
  binary can load `libgomp.so.1` at runtime.
- `sieve-frontend` — static site. Builds the Vite app with `npm ci && npm run build`
  and serves `dist`.

### Wiring the services together

The frontend reads its backend URL from `VITE_API_URL` (baked in at build time), and
the backend allows cross-origin requests listed in `ALLOWED_ORIGINS`. Set these on
Render:

| Service | Variable | Value |
| --- | --- | --- |
| `sieve-frontend` | `VITE_API_URL` | `https://sieve-backend-jcau.onrender.com` |
| `sieve-backend` | `ALLOWED_ORIGINS` | `https://sieve-frontend-0uou.onrender.com` |

After changing `VITE_API_URL`, trigger **Manual Deploy → Clear build cache & deploy**
on the frontend (the value is baked into the bundle at build time).

### Redeploying

Deploys are tied to `main`. After pushing, trigger **Manual Deploy → Clear build cache
& deploy** on the affected service if auto-deploy doesn't pick it up.

Note: the free plan has 512 MB RAM, which is comfortable up to roughly 10–25M. Very
large limits (100M) may need a larger instance.

## Development Commands

```powershell
# Rebuild after changing cpp/sieve_serial.cpp or cpp/sieve_openmp.cpp
g++ -O2 -Wall -Wextra -std=c++17 -o backend\bin\sieve_serial.exe cpp\sieve_serial.cpp
g++ -O2 -Wall -Wextra -std=c++17 -fopenmp -o backend\bin\sieve_openmp.exe cpp\sieve_openmp.cpp

# Run services separately
python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
npm --prefix frontend run dev -- --host 127.0.0.1
```

The frontend proxies `/api/*` requests to the backend. For example, `http://127.0.0.1:5173/api/system` returns the same metadata as `http://127.0.0.1:8000/system`.

## PADC Verification and Benchmarking

The active PADC implementation is in `cpp/`; it is the source used by the API binaries. Run the correctness suite and repeated strong-scaling experiment after building:

```powershell
python tests\test_sieves.py
python benchmarks\run_scalability.py
```

The benchmark validates known prime counts for `100,000`, `1,000,000`, and `10,000,000`, runs one warm-up and seven measured samples at 1, 2, 4, and 8 OpenMP threads, and writes the canonical CSV, raw trials, metadata, and generated Markdown table to `results/`. See `docs/PADC_ANALYSIS.md` for the algorithm, PCAM/dependency analysis, diagrams, and limitations.
