#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <omp.h>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
constexpr int kMaxLimit = 100000000;
constexpr int kDefaultBlockSize = 10000;
constexpr const char* kDefaultSchedule = "static";

int parse_limit(const char* value) {
    size_t parsed = 0;
    const int limit = std::stoi(value, &parsed);
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

int parse_block_size(const char* value) {
    size_t parsed = 0;
    const int block_size = std::stoi(value, &parsed);
    if (value[parsed] != '\0' || block_size < 1 || block_size > kMaxLimit) {
        throw std::invalid_argument("block_size must be an integer between 1 and 100000000");
    }
    return block_size;
}

std::string parse_schedule(const char* value) {
    std::string schedule(value);
    if (schedule == "static" || schedule == "dynamic" || schedule == "guided") {
        return schedule;
    }
    throw std::invalid_argument("schedule must be one of: static, dynamic, guided");
}

std::string parse_strategy(const char* value) {
    std::string strategy(value);
    if (strategy == "block" || strategy == "naive") {
        return strategy;
    }
    throw std::invalid_argument("strategy must be one of: block, naive");
}

std::vector<int> generateBasePrimes(int n) {
    const int root = static_cast<int>(std::sqrt(n));
    std::vector<char> baseIsPrime(root + 1, true);
    baseIsPrime[0] = false;
    baseIsPrime[1] = false;
    std::vector<int> basePrimes;

    for (int p = 2; p <= root; ++p) {
        if (baseIsPrime[p]) {
            basePrimes.push_back(p);
            if (p <= root / p) {
                for (int multiple = p * p; multiple <= root; multiple += p) {
                    baseIsPrime[multiple] = false;
                }
            }
        }
    }
    return basePrimes;
}

std::vector<char> parallelSieve(int n, int threads, int block_size, const std::string& schedule,
                                long long& primeCount, int& actualThreads, double& parallelTime) {
    // The base primes are created first because all blocks depend on them.
    const std::vector<int> basePrimes = generateBasePrimes(n);
    std::vector<char> isPrime(n + 1, true);
    isPrime[0] = false;
    isPrime[1] = false;
    const int blockCount = (n - 1 + block_size - 1) / block_size;

    omp_set_num_threads(threads);
    const double startTime = omp_get_wtime();
    actualThreads = 0;

    // Every iteration owns a separate block, eliminating write-write races.
    if (schedule == "static") {
        #pragma omp parallel default(none) shared(n, blockCount, block_size, basePrimes, isPrime, actualThreads)
        {
            #pragma omp single
            actualThreads = omp_get_num_threads();

            #pragma omp for schedule(static)
            for (int block = 0; block < blockCount; ++block) {
                const int low = 2 + block * block_size;
                const int high = std::min(n, low + block_size - 1);

                for (int p : basePrimes) {
                    int firstMultiple = ((low + p - 1) / p) * p;
                    if (p <= n / p) {
                        firstMultiple = std::max(firstMultiple, p * p);
                    }
                    for (int multiple = firstMultiple; multiple <= high; multiple += p) {
                        isPrime[multiple] = false;
                    }
                }
            }
        }
    } else if (schedule == "dynamic") {
        #pragma omp parallel default(none) shared(n, blockCount, block_size, basePrimes, isPrime, actualThreads)
        {
            #pragma omp single
            actualThreads = omp_get_num_threads();

            #pragma omp for schedule(dynamic)
            for (int block = 0; block < blockCount; ++block) {
                const int low = 2 + block * block_size;
                const int high = std::min(n, low + block_size - 1);

                for (int p : basePrimes) {
                    int firstMultiple = ((low + p - 1) / p) * p;
                    if (p <= n / p) {
                        firstMultiple = std::max(firstMultiple, p * p);
                    }
                    for (int multiple = firstMultiple; multiple <= high; multiple += p) {
                        isPrime[multiple] = false;
                    }
                }
            }
        }
    } else {
        #pragma omp parallel default(none) shared(n, blockCount, block_size, basePrimes, isPrime, actualThreads)
        {
            #pragma omp single
            actualThreads = omp_get_num_threads();

            #pragma omp for schedule(guided)
            for (int block = 0; block < blockCount; ++block) {
                const int low = 2 + block * block_size;
                const int high = std::min(n, low + block_size - 1);

                for (int p : basePrimes) {
                    int firstMultiple = ((low + p - 1) / p) * p;
                    if (p <= n / p) {
                        firstMultiple = std::max(firstMultiple, p * p);
                    }
                    for (int multiple = firstMultiple; multiple <= high; multiple += p) {
                        isPrime[multiple] = false;
                    }
                }
            }
        }
    }

    primeCount = 0;
    if (schedule == "static") {
        #pragma omp parallel for default(none) shared(n, isPrime) reduction(+:primeCount) schedule(static)
        for (int number = 2; number <= n; ++number) {
            if (isPrime[number]) {
                ++primeCount;
            }
        }
    } else if (schedule == "dynamic") {
        #pragma omp parallel for default(none) shared(n, isPrime) reduction(+:primeCount) schedule(dynamic)
        for (int number = 2; number <= n; ++number) {
            if (isPrime[number]) {
                ++primeCount;
            }
        }
    } else {
        #pragma omp parallel for default(none) shared(n, isPrime) reduction(+:primeCount) schedule(guided)
        for (int number = 2; number <= n; ++number) {
            if (isPrime[number]) {
                ++primeCount;
            }
        }
    }

    parallelTime = omp_get_wtime() - startTime;
    return isPrime;
}

std::vector<char> parallelSieveNaive(int n, int threads, const std::string& schedule,
                                    long long& primeCount, int& actualThreads, double& parallelTime) {
    const std::vector<int> basePrimes = generateBasePrimes(n);
    std::vector<char> isPrime(n + 1, true);
    isPrime[0] = false;
    isPrime[1] = false;

    omp_set_num_threads(threads);
    const double startTime = omp_get_wtime();
    actualThreads = 0;

    #pragma omp parallel default(none) shared(basePrimes, isPrime, actualThreads, n)
    {
        #pragma omp single
        actualThreads = omp_get_num_threads();

        #pragma omp for schedule(static)
        for (int primeIndex = 0; primeIndex < static_cast<int>(basePrimes.size()); ++primeIndex) {
            const int p = basePrimes[primeIndex];
            for (int multiple = p * p; multiple <= n; multiple += p) {
                #pragma omp critical
                {
                    isPrime[multiple] = false;
                }
            }
        }
    }

    primeCount = 0;
    #pragma omp parallel for default(none) shared(n, isPrime) reduction(+:primeCount) schedule(static)
    for (int number = 2; number <= n; ++number) {
        if (isPrime[number]) {
            ++primeCount;
        }
    }

    parallelTime = omp_get_wtime() - startTime;
    return isPrime;
}

std::vector<char> executeOpenMPStrategy(int n, int threads, int block_size, const std::string& schedule,
                                       const std::string& strategy, long long& primeCount,
                                       int& actualThreads, double& parallelTime) {
    if (strategy == "naive") {
        return parallelSieveNaive(n, threads, schedule, primeCount, actualThreads, parallelTime);
    }
    return parallelSieve(n, threads, block_size, schedule, primeCount, actualThreads, parallelTime);
}

void print_json(int limit, int threads, int actual_threads, long long prime_count,
                double elapsed_ms, int repetitions, int block_size, const std::string& schedule,
                const std::string& strategy, const std::vector<char>& is_prime, bool return_primes) {
    std::cout << std::setprecision(12) << "{"
              << "\"algorithm\":\"openmp\","
              << "\"limit\":" << limit << ","
              << "\"num_threads\":" << threads << ","
              << "\"actual_threads\":" << actual_threads << ","
              << "\"block_size\":" << block_size << ","
              << "\"schedule\":\"" << schedule << "\","
              << "\"strategy\":\"" << strategy << "\","
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
    if (argc < 2 || argc > 8) {
        std::cerr << "Usage: sieve_openmp <limit> [num_threads=4] [return_primes=1] [timing_repetitions=1] [block_size=10000] [schedule=static] [strategy=block]\n";
        return 1;
    }

    try {
        const int limit = parse_limit(argv[1]);
        const int threads = argc >= 3 ? parse_threads(argv[2]) : 4;
        const bool return_primes = argc >= 4 ? std::string(argv[3]) == "1" : true;
        const int repetitions = argc >= 5 ? parse_repetitions(argv[4]) : 1;
        const int block_size = argc >= 6 ? parse_block_size(argv[5]) : kDefaultBlockSize;
        const std::string schedule = argc >= 7 ? parse_schedule(argv[6]) : kDefaultSchedule;
        const std::string strategy = argc >= 8 ? parse_strategy(argv[7]) : "block";
        std::vector<char> is_prime;
        long long prime_count = 0;
        int actual_threads = 0;
        double total_time = 0.0;

        for (int run = 0; run < repetitions; ++run) {
            double run_time = 0.0;
            is_prime = executeOpenMPStrategy(limit, threads, block_size, schedule, strategy,
                                            prime_count, actual_threads, run_time);
            total_time += run_time;
        }

        print_json(limit, threads, actual_threads, prime_count, total_time * 1000.0 / repetitions,
                   repetitions, block_size, schedule, strategy, is_prime, return_primes);
    } catch (const std::exception& error) {
        std::cerr << "Invalid argument: " << error.what() << "\n";
        return 1;
    }
    return 0;
}
