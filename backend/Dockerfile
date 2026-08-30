# Build stage: compile the C++ binaries with OpenMP support
FROM gcc:14 AS builder

WORKDIR /build
COPY cpp/sieve_serial.cpp .
COPY cpp/sieve_openmp.cpp .

RUN g++ -O2 -std=c++17 -o /out/sieve_serial sieve_serial.cpp \
    && g++ -O2 -std=c++17 -fopenmp -o /out/sieve_openmp sieve_openmp.cpp

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .
# Place compiled binaries into app/bin (where backend/main.py expects them)
RUN mkdir -p /app/bin \
    && cp /dev/null /app/bin/.placeholder
COPY --from=builder /out/sieve_serial /out/sieve_openmp /app/bin/

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
