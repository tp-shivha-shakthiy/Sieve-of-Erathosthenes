#include <algorithm>
#include <cmath>
#include <cstdint>
#include <iomanip>
#include <iostream>
#include <omp.h>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
constexpr long long kMaxLimit = 100000000;
constexpr long long kBlockSize = 32768;
constexpr int kTimingRepetitions = 10;
constexpr int kSmallInputTimingRepetitions = 1000;

long long parse_limit(const char* text) {
    size_t consumed = 0;
    const long long limit = std::stoll(text, &consumed);
    if (text[consumed] != '\0' || limit < 2 || limit > kMaxLimit) {
        throw std::invalid_argument("n must be an integer from 2 to 100000000");
    }
    return limit;
}

int parse_threads(const char* text) {
    size_t consumed = 0;
    const int threads = std::stoi(text, &consumed);
    if (text[consumed] != '\0' || threads < 1 || threads > 64) {
        throw std::invalid_argument("thread count must be an integer from 1 to 64");
    }
    return threads;
}

std::vector<long long> make_base_primes(long long limit) {
    long long root = static_cast<long long>(std::sqrt(static_cast<double>(limit)));
    while ((root + 1) * (root + 1) <= limit) ++root;
    while (root * root > limit) --root;
    std::vector<uint8_t> candidates(static_cast<size_t>(root + 1), 1);
    candidates[0] = candidates[1] = 0;
    std::vector<long long> base_primes;
    for (long long p = 2; p <= root; ++p) {
        if (candidates[static_cast<size_t>(p)] == 0) continue;
        base_primes.push_back(p);
        for (long long multiple = p * p; multiple <= root; multiple += p) {
            candidates[static_cast<size_t>(multiple)] = 0;
        }
    }
    return base_primes;
}

struct Result {
    long long prime_count;
    double elapsed_ms;
    int actual_threads;
    int timing_repetitions;
    std::vector<long long> primes;
};

Result sieve(long long limit, int requested_threads, bool collect_primes) {
    omp_set_dynamic(0);
    omp_set_num_threads(requested_threads);
    const double started = omp_get_wtime();
    const std::vector<long long> base_primes = make_base_primes(limit);
    const long long block_count = (limit - 1 + kBlockSize - 1) / kBlockSize;
    long long prime_count = 0;
    std::vector<std::vector<long long>> primes_by_block(
        collect_primes ? static_cast<size_t>(block_count) : 0);

    #pragma omp parallel for schedule(static) reduction(+:prime_count)
    for (long long block = 0; block < block_count; ++block) {
        const long long low = 2 + block * kBlockSize;
        const long long high = std::min(limit, low + kBlockSize - 1);
        std::vector<uint8_t> segment(static_cast<size_t>(high - low + 1), 1);
        long long local_count = 0;
        std::vector<long long> local_primes;
        for (long long p : base_primes) {
            long long first = ((low + p - 1) / p) * p;
            first = std::max(first, p * p);
            for (long long multiple = first; multiple <= high; multiple += p) {
                segment[static_cast<size_t>(multiple - low)] = 0;
            }
        }
        for (long long value = low; value <= high; ++value) {
            if (segment[static_cast<size_t>(value - low)] != 0) {
                ++local_count;
                if (collect_primes) local_primes.push_back(value);
            }
        }
        if (collect_primes) primes_by_block[static_cast<size_t>(block)] = std::move(local_primes);
        prime_count += local_count;
    }

    std::vector<long long> primes;
    if (collect_primes) {
        for (const auto& block_primes : primes_by_block) {
            primes.insert(primes.end(), block_primes.begin(), block_primes.end());
        }
    }
    const double elapsed_ms = (omp_get_wtime() - started) * 1000.0;
    return {prime_count, elapsed_ms, omp_get_max_threads(), 1, std::move(primes)};
}

Result timed_sieve(long long limit, int requested_threads, bool collect_primes) {
    const double started = omp_get_wtime();
    const int repetitions = limit <= 1000 ? kSmallInputTimingRepetitions : kTimingRepetitions;
    Result result{};
    for (int run = 0; run < repetitions; ++run) {
        result = sieve(limit, requested_threads, collect_primes);
    }
    result.elapsed_ms = ((omp_get_wtime() - started) * 1000.0) / repetitions;
    result.timing_repetitions = repetitions;
    return result;
}

void print_result(long long limit, int requested_threads, const Result& result, bool quiet) {
    if (quiet) {
        std::cout << "RESULT,openmp," << limit << "," << result.actual_threads << ","
                  << result.prime_count << "," << std::fixed << std::setprecision(6)
                  << result.elapsed_ms << "\n";
        return;
    }
    const long long block_count = (limit - 1 + kBlockSize - 1) / kBlockSize;
    std::cout << "Execution mode: OpenMP\n"
              << "Input size (n): " << limit << "\n"
              << "Requested thread count: " << requested_threads << "\n"
              << "Actual thread count: " << result.actual_threads << "\n"
              << "Block size: " << kBlockSize << "\n"
              << "Number of blocks: " << block_count << "\n"
              << "Timing repetitions: " << result.timing_repetitions << "\n"
              << "Prime count: " << result.prime_count << "\n"
              << "Elapsed time (ms): " << std::fixed << std::setprecision(6) << result.elapsed_ms << "\n";
    if (!result.primes.empty()) {
        std::cout << "Primes: ";
        for (size_t i = 0; i < result.primes.size(); ++i) {
            if (i != 0) std::cout << ", ";
            std::cout << result.primes[i];
        }
        std::cout << "\n";
    }
}
}

int main(int argc, char* argv[]) {
    if (argc < 3 || argc > 4) {
        std::cerr << "Usage: openmp_sieve <n> <threads> [--quiet]\n";
        return 1;
    }
    const bool quiet = argc == 4 && std::string(argv[3]) == "--quiet";
    if (argc == 4 && !quiet) {
        std::cerr << "Usage: openmp_sieve <n> <threads> [--quiet]\n";
        return 1;
    }
    try {
        const long long limit = parse_limit(argv[1]);
        const int threads = parse_threads(argv[2]);
        print_result(limit, threads, timed_sieve(limit, threads, !quiet && limit <= 1000), quiet);
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << "\n";
        return 1;
    }
}
