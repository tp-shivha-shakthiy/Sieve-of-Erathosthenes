#include <iostream>
#include <vector>
#include <chrono>
#include <cmath>
#include <iomanip>
#include <sstream>
#include <stdexcept>
#include <string>

namespace {
constexpr long long kMaxLimit = 100000000;

long long parse_limit(const char* value) {
    size_t parsed = 0;
    const long long limit = std::stoll(value, &parsed);
    if (value[parsed] != '\0' || limit < 2 || limit > kMaxLimit) {
        throw std::invalid_argument("limit must be an integer between 2 and 100000000");
    }
    return limit;
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
        std::cerr << "Usage: sieve_serial <limit> [return_primes=1] [timing_repetitions=1]" << std::endl;
        return 1;
    }

    long long limit;
    int timing_repetitions;
    try {
        limit = parse_limit(argv[1]);
        timing_repetitions = (argc >= 4) ? parse_repetitions(argv[3]) : 1;
    } catch (const std::exception& error) {
        std::cerr << "Invalid limit: " << error.what() << std::endl;
        return 1;
    }
    bool return_primes = (argc >= 3) ? (std::string(argv[2]) == "1") : true;

    std::vector<char> is_prime;
    long long prime_count = 0;
    const auto start = std::chrono::high_resolution_clock::now();
    for (int repetition = 0; repetition < timing_repetitions; ++repetition) {
        // Match the OpenMP representation so timing compares parallelism, not bit packing.
        is_prime.assign(limit + 1, 1);
        is_prime[0] = is_prime[1] = 0;

        for (long long p = 2; p * p <= limit; p++) {
            if (is_prime[p]) {
                for (long long i = p * p; i <= limit; i += p) {
                    is_prime[i] = 0;
                }
            }
        }

        prime_count = 0;
        for (long long i = 2; i <= limit; i++) {
            if (is_prime[i]) prime_count++;
        }
    }

    const auto end = std::chrono::high_resolution_clock::now();
    const double elapsed_ms = std::chrono::duration<double, std::milli>(end - start).count() / timing_repetitions;

    std::cout << std::setprecision(12);
    std::cout << "{";
    std::cout << "\"algorithm\":\"serial\",";
    std::cout << "\"limit\":" << limit << ",";
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
