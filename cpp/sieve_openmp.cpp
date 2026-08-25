#include <iostream>
#include <vector>
#include <chrono>
#include <cmath>
#include <omp.h>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: sieve_openmp <limit> [num_threads=4] [return_primes=1]" << std::endl;
        return 1;
    }

    long long limit = std::stoll(argv[1]);
    int num_threads = (argc >= 3) ? std::stoi(argv[2]) : 4;
    bool return_primes = (argc >= 4) ? (std::string(argv[3]) == "1") : true;

    omp_set_num_threads(num_threads);

    auto start = std::chrono::high_resolution_clock::now();

    std::vector<char> is_prime(limit + 1, 1);
    is_prime[0] = is_prime[1] = 0;

    long long sqrt_limit = static_cast<long long>(std::sqrt(static_cast<double>(limit)));

    // Phase 1 (serial): sieve up to sqrt(limit) and collect base primes
    std::vector<long long> base_primes;
    for (long long p = 2; p <= sqrt_limit; p++) {
        if (is_prime[p]) {
            base_primes.push_back(p);
            for (long long j = p * p; j <= sqrt_limit; j += p) {
                is_prime[j] = 0;
            }
        }
    }

    // Phase 2 (parallel): each thread handles a subset of base primes,
    // marking composites in range [sqrt_limit+1, limit]
    #pragma omp parallel for schedule(dynamic)
    for (size_t idx = 0; idx < base_primes.size(); idx++) {
        long long p = base_primes[idx];
        long long start = ((sqrt_limit + 1 + p - 1) / p) * p;
        if (start < p * p) start = p * p;
        for (long long j = start; j <= limit; j += p) {
            is_prime[j] = 0;
        }
    }

    long long prime_count = 0;
    for (long long i = 2; i <= limit; i++) {
        if (is_prime[i]) prime_count++;
    }

    auto end = std::chrono::high_resolution_clock::now();
    double elapsed_ms = std::chrono::duration<double, std::milli>(end - start).count();

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
