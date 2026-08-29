#include <algorithm>
#include <iostream>
#include <cstdlib>
#include <vector>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <omp.h>
#include <stdexcept>
#include <string>

namespace {
constexpr long long kMaxLimit = 100000000;
constexpr long long kBlockSize = 32768;

long long parse_limit(const char* value) {
    size_t parsed = 0;
    const long long limit = std::stoll(value, &parsed);
    if (value[parsed] != '\0' || limit < 2 || limit > kMaxLimit) {
        throw std::invalid_argument("limit must be an integer between 2 and 100000000");
    }
    return limit;
}

int parse_threads(const char* value) {
    size_t parsed = 0;
    const int threads = std::stoi(value, &parsed);
    if (value[parsed] != '\0' || threads < 1 || threads > 64) {
        throw std::invalid_argument("num_threads must be an integer between 1 and 64");
    }
    return threads;
}
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: sieve_openmp <limit> [num_threads=4] [return_primes=1]" << std::endl;
        return 1;
    }

    long long limit;
    int num_threads;
    try {
        limit = parse_limit(argv[1]);
        num_threads = (argc >= 3) ? parse_threads(argv[2]) : 4;
    } catch (const std::exception& error) {
        std::cerr << "Invalid argument: " << error.what() << std::endl;
        return 1;
    }
    bool return_primes = (argc >= 4) ? (std::string(argv[3]) == "1") : true;

    omp_set_num_threads(num_threads);

    auto start = std::chrono::high_resolution_clock::now();

    long long sqrt_limit = static_cast<long long>(std::sqrt(static_cast<double>(limit)));

    // Communication phase: build a small, read-only list shared by every worker.
    std::vector<char> base_is_prime(sqrt_limit + 1, 1);
    base_is_prime[0] = base_is_prime[1] = 0;
    std::vector<long long> base_primes;
    for (long long p = 2; p <= sqrt_limit; p++) {
        if (base_is_prime[p]) {
            base_primes.push_back(p);
            for (long long j = p * p; j <= sqrt_limit; j += p) {
                base_is_prime[j] = 0;
            }
        }
    }

    std::vector<char> is_prime(limit + 1, 1);
    is_prime[0] = is_prime[1] = 0;
    const long long block_count = (limit - 1 + kBlockSize - 1) / kBlockSize;
    long long prime_count = 0;

    // Partition the regular number domain into disjoint blocks. Static mapping has
    // no write sharing, and each thread only reads the shared base-prime list.
    #pragma omp parallel for schedule(static) reduction(+:prime_count)
    for (long long block = 0; block < block_count; block++) {
        const long long block_start = 2 + block * kBlockSize;
        const long long block_end = std::min(limit, block_start + kBlockSize - 1);
        long long local_count = 0;

        for (long long p : base_primes) {
            long long start = ((block_start + p - 1) / p) * p;
            if (start < p * p) start = p * p;
            for (long long j = start; j <= block_end; j += p) {
                is_prime[j] = 0;
            }
        }

        for (long long i = block_start; i <= block_end; i++) {
            local_count += is_prime[i];
        }
        prime_count += local_count;
    }

    auto end = std::chrono::high_resolution_clock::now();
    double elapsed_ms = std::chrono::duration<double, std::milli>(end - start).count();

    std::cout << std::setprecision(12);
    std::cout << "{";
    std::cout << "\"algorithm\":\"openmp\",";
    std::cout << "\"limit\":" << limit << ",";
    std::cout << "\"num_threads\":" << num_threads << ",";
    std::cout << "\"prime_count\":" << prime_count << ",";
    std::cout << "\"execution_time_ms\":" << elapsed_ms << ",";

    if (return_primes && limit <= 1000000) {
        std::cout << "\"primes\":[";
        bool first = true;
        for (long long i = 2; i <= limit; i++) {
            if (is_prime[i]) {
                if (!first) std::cout << ",";
                std::cout << i;
                first = false;
            }
        }
        std::cout << "]";
    } else {
        std::cout << "\"primes\":[]";
    }

    std::cout << "}" << std::endl;
    return 0;
}
