#include <chrono>
#include <iomanip>
#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
constexpr int kMaxLimit = 100000000;

int parse_limit(const char* value) {
    size_t parsed = 0;
    const int limit = std::stoi(value, &parsed);
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

std::vector<char> serialSieve(int n) {
    std::vector<char> isPrime(n + 1, true);
    isPrime[0] = false;
    isPrime[1] = false;

    for (int p = 2; p <= n / p; ++p) {
        if (isPrime[p]) {
            for (int multiple = p * p; multiple <= n; multiple += p) {
                isPrime[multiple] = false;
            }
        }
    }
    return isPrime;
}

long long count_primes(const std::vector<char>& is_prime) {
    long long count = 0;
    for (size_t number = 2; number < is_prime.size(); ++number) {
        count += is_prime[number];
    }
    return count;
}

void print_json(int limit, long long prime_count, double elapsed_ms, int repetitions,
                const std::vector<char>& is_prime, bool return_primes) {
    std::cout << std::setprecision(12) << "{"
              << "\"algorithm\":\"serial\","
              << "\"limit\":" << limit << ","
              << "\"prime_count\":" << prime_count << ","
              << "\"execution_time_ms\":" << elapsed_ms << ","
              << "\"average_per_run_ms\":" << elapsed_ms << ","
              << "\"timing_repetitions\":" << repetitions << ","
              << "\"primes\":[";
    if (return_primes && limit <= 1000000) {
        bool first = true;
        for (int number = 2; number <= limit; ++number) {
            if (is_prime[number]) {
                if (!first) std::cout << ",";
                std::cout << number;
                first = false;
            }
        }
    }
    std::cout << "]}" << std::endl;
}
}

int main(int argc, char* argv[]) {
    if (argc < 2 || argc > 4) {
        std::cerr << "Usage: sieve_serial <limit> [return_primes=1] [timing_repetitions=1]\n";
        return 1;
    }

    try {
        const int limit = parse_limit(argv[1]);
        const bool return_primes = argc >= 3 ? std::string(argv[2]) == "1" : true;
        const int repetitions = argc >= 4 ? parse_repetitions(argv[3]) : 1;
        std::vector<char> is_prime;
        long long prime_count = 0;

        const auto start = std::chrono::high_resolution_clock::now();
        for (int run = 0; run < repetitions; ++run) {
            is_prime = serialSieve(limit);
            prime_count = count_primes(is_prime);
        }
        const auto end = std::chrono::high_resolution_clock::now();
        const double elapsed_ms =
            std::chrono::duration<double, std::milli>(end - start).count() / repetitions;

        print_json(limit, prime_count, elapsed_ms, repetitions, is_prime, return_primes);
    } catch (const std::exception& error) {
        std::cerr << "Invalid argument: " << error.what() << "\n";
        return 1;
    }
    return 0;
}
