#include <iostream>
#include <vector>
#include <chrono>
#include <cmath>
#include <sstream>

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cerr << "Usage: sieve_serial <limit> [return_primes=1]" << std::endl;
        return 1;
    }

    long long limit = std::stoll(argv[1]);
    bool return_primes = (argc >= 3) ? (std::string(argv[2]) == "1") : true;

    auto start = std::chrono::high_resolution_clock::now();

    std::vector<bool> is_prime(limit + 1, true);
    is_prime[0] = is_prime[1] = false;

    for (long long p = 2; p * p <= limit; p++) {
        if (is_prime[p]) {
            for (long long i = p * p; i <= limit; i += p) {
                is_prime[i] = false;
            }
        }
    }

    long long prime_count = 0;
    for (long long i = 2; i <= limit; i++) {
        if (is_prime[i]) prime_count++;
    }

    auto end = std::chrono::high_resolution_clock::now();
    double elapsed_ms = std::chrono::duration<double, std::milli>(end - start).count();

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
