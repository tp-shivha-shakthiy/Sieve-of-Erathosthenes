#!/usr/bin/env bash
set -e

echo "=== Building C++ sieve binaries ==="
mkdir -p cpp/build backend/bin

if command -v cmake &> /dev/null; then
    cd cpp/build
    cmake ..
    cmake --build . --config Release
    cd ../..
else
    echo "CMake not found, using g++ directly..."
    g++ -O2 -Wall -Wextra -std=c++17 -o backend/bin/sieve_serial cpp/sieve_serial.cpp
    g++ -O2 -Wall -Wextra -std=c++17 -fopenmp -o backend/bin/sieve_openmp cpp/sieve_openmp.cpp
fi

echo ""
echo "=== Installing Python dependencies ==="
cd backend
pip install -r requirements.txt
cd ..

echo ""
echo "=== Installing frontend dependencies ==="
cd frontend
npm install
cd ..

echo ""
echo "=== Build complete ==="
echo "Run './start.sh' to launch the full stack."
