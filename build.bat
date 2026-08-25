@echo off
echo === Building C++ sieve binaries ===
if not exist cpp\build mkdir cpp\build
if not exist backend\bin mkdir backend\bin

where cmake >nul 2>&1
if %ERRORLEVEL%==0 (
    cd cpp\build
    cmake .. -G "Visual Studio 17 2022" -A x64
    cmake --build . --config Release
    cd ..\..
) else (
    echo CMake not found, using g++ directly...
    g++ -O2 -std=c++17 -o backend\bin\sieve_serial.exe cpp\sieve_serial.cpp
    g++ -O2 -std=c++17 -fopenmp -o backend\bin\sieve_openmp.exe cpp\sieve_openmp.cpp
)

echo === Installing Python dependencies ===
cd backend
pip install -r requirements.txt
cd ..

echo === Installing frontend dependencies ===
cd frontend
call npm install
cd ..

echo === Build complete ===
echo Run start.bat to launch the full stack.
