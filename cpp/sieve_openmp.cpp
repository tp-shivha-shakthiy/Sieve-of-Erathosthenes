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

int parse_repetitions(const char* value) {
    size_t parsed = 0;
    const int repetitions = std::stoi(value, &parsed);
    if (value[parsed] != '\0' || repetitions < 1 || repetitions > 1000) {
        throw std::invalid_argument("timing repetitions must be an integer between 1 and 1000");
    }
    return repetitions;
}
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: sieve_openmp <limit> [num_threads=4] [return_primes=1] [timing_repetitions=1]" << std::endl;
        return 1;
    }

    long long limit;
    int num_threads;
    int timing_repetitions;
    try {
        limit = parse_limit(argv[1]);
        num_threads = (argc >= 3) ? parse_threads(argv[2]) : 4;
        timing_repetitions = (argc >= 5) ? parse_repetitions(argv[4]) : 1;
    } catch (const std::exception& error) {
        std::cerr << "Invalid argument: " << error.what() << std::endl;
        return 1;
    }
    bool return_primes = (argc >= 4) ? (std::string(argv[3]) == "1") : true;

    omp_set_num_threads(num_threads);

    std::vector<char> is_prime;
    long long prime_count = 0;
    int actual_threads = 0;
    const double start = omp_get_wtime();
    for (int repetition = 0; repetition < timing_repetitions; ++repetition) {
        const long long sqrt_limit = static_cast<long long>(std::sqrt(static_cast<double>(limit)));

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

        is_prime.assign(limit + 1, 1);
        is_prime[0] = is_prime[1] = 0;
        const long long block_count = (limit - 1 + kBlockSize - 1) / kBlockSize;
        prime_count = 0;

        // Partition the regular number domain into disjoint blocks. Static mapping has
        // no write sharing, and each thread only reads the shared base-prime list.
        #pragma omp parallel reduction(+:prime_count)
        {
            #pragma omp single
            actual_threads = omp_get_num_threads();

            #pragma omp for schedule(static)
            for (long long block = 0; block < block_count; block++) {
                const long long block_start = 2 + block * kBlockSize;
                const long long block_end = std::min(limit, block_start + kBlockSize - 1);
                long long local_count = 0;

                for (long long p : base_primes) {
                    // max(p*p, ceil(block_start / p) * p) stays within this owned block.
                    long long first_multiple = ((block_start + p - 1) / p) * p;
                    if (first_multiple < p * p) first_multiple = p * p;
                    for (long long j = first_multiple; j <= block_end; j += p) {
                        is_prime[j] = 0;
                    }
                }

                for (long long i = block_start; i <= block_end; i++) {
                    local_count += is_prime[i];
                }
                prime_count += local_count;
            }
        }
    }

    const double elapsed_ms = ((omp_get_wtime() - start) * 1000.0) / timing_repetitions;

    std::cout << std::setprecision(12);
    std::cout << "{";
    std::cout << "\"algorithm\":\"openmp\",";
    std::cout << "\"limit\":" << limit << ",";
    std::cout << "\"num_threads\":" << num_threads << ",";
    std::cout << "\"actual_threads\":" << actual_threads << ",";
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
