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
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: sieve_serial <limit> [return_primes=1]" << std::endl;
        return 1;
    }

    long long limit;
    try {
        limit = parse_limit(argv[1]);
    } catch (const std::exception& error) {
        std::cerr << "Invalid limit: " << error.what() << std::endl;
        return 1;
    }
    bool return_primes = (argc >= 3) ? (std::string(argv[2]) == "1") : true;

    auto start = std::chrono::high_resolution_clock::now();

    // Match the OpenMP representation so timing compares parallelism, not bit packing.
    std::vector<char> is_prime(limit + 1, 1);
    is_prime[0] = is_prime[1] = 0;

    for (long long p = 2; p * p <= limit; p++) {
        if (is_prime[p]) {
            for (long long i = p * p; i <= limit; i += p) {
                is_prime[i] = 0;
            }
        }
    }

    long long prime_count = 0;
    for (long long i = 2; i <= limit; i++) {
        if (is_prime[i]) prime_count++;
    }

    auto end = std::chrono::high_resolution_clock::now();
    double elapsed_ms = std::chrono::duration<double, std::milli>(end - start).count();

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
