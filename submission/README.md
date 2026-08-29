## Build in Windows PowerShell (MinGW)

```powershell
New-Item -ItemType Directory -Force bin
g++ -O2 -Wall -Wextra -std=c++17 -fopenmp serial_sieve.cpp -o bin\serial_sieve.exe
g++ -O2 -Wall -Wextra -std=c++17 -fopenmp openmp_sieve.cpp -o bin\openmp_sieve.exe
```

## Run

```powershell
.\bin\serial_sieve.exe 30
.\bin\openmp_sieve.exe 30 4
.\bin\serial_sieve.exe 10000000
.\bin\openmp_sieve.exe 10000000 4
python run_benchmark.py
```

The benchmark writes `benchmark_results.csv` (raw samples and summaries) and `benchmark_metadata.txt`. Diagram sources are valid Mermaid files in `diagrams/`; Mermaid CLI and Graphviz were unavailable on the measurement machine, so no rendered SVG/PNG is included.
