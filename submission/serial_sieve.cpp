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
constexpr const char* kStudentName = "tp-shivha-shakthiy";
constexpr const char* kRollNumber = "ROLL_NUMBER_HERE";

long long parse_limit(const char* text) {
    size_t consumed = 0;
    const long long limit = std::stoll(text, &consumed);
    if (text[consumed] != '\0' || limit < 2 || limit > kMaxLimit) {
        throw std::invalid_argument("n must be an integer from 2 to 100000000");
    }
    return limit;
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
    int timing_repetitions;
    std::vector<long long> primes;
};

Result sieve(long long limit, bool collect_primes) {
    const double started = omp_get_wtime();
    const std::vector<long long> base_primes = make_base_primes(limit);
    const long long block_count = (limit - 1 + kBlockSize - 1) / kBlockSize;
    long long prime_count = 0;
    std::vector<long long> primes;

    for (long long block = 0; block < block_count; ++block) {
        const long long low = 2 + block * kBlockSize;
        const long long high = std::min(limit, low + kBlockSize - 1);
        std::vector<uint8_t> segment(static_cast<size_t>(high - low + 1), 1);
        for (long long p : base_primes) {
            long long first = ((low + p - 1) / p) * p;
            first = std::max(first, p * p);
            for (long long multiple = first; multiple <= high; multiple += p) {
                segment[static_cast<size_t>(multiple - low)] = 0;
            }
        }
        for (long long value = low; value <= high; ++value) {
            if (segment[static_cast<size_t>(value - low)] != 0) {
                ++prime_count;
                if (collect_primes) primes.push_back(value);
            }
        }
    }
    const double elapsed_ms = (omp_get_wtime() - started) * 1000.0;
    return {prime_count, elapsed_ms, 1, std::move(primes)};
}

Result timed_sieve(long long limit, bool collect_primes) {
    const double started = omp_get_wtime();
    const int repetitions = limit <= 1000 ? kSmallInputTimingRepetitions : kTimingRepetitions;
    Result result{};
    for (int run = 0; run < repetitions; ++run) {
        result = sieve(limit, collect_primes);
    }
    result.elapsed_ms = ((omp_get_wtime() - started) * 1000.0) / repetitions;
    result.timing_repetitions = repetitions;
    return result;
}

void print_result(long long limit, const Result& result, bool quiet) {
    if (quiet) {
        std::cout << "RESULT,serial," << limit << ",1," << result.prime_count << ","
                  << std::fixed << std::setprecision(6) << result.elapsed_ms << "\n";
        return;
    }
    const long long block_count = (limit - 1 + kBlockSize - 1) / kBlockSize;
    std::cout << "Student name: " << kStudentName << "\n"
              << "Roll number: " << kRollNumber << "\n"
              << "Execution mode: Serial\n"
              << "Input size (n): " << limit << "\n"
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
    if (argc < 2 || argc > 3) {
        std::cerr << "Usage: serial_sieve <n> [--quiet]\n";
        return 1;
    }
    const bool quiet = argc == 3 && std::string(argv[2]) == "--quiet";
    if (argc == 3 && !quiet) {
        std::cerr << "Usage: serial_sieve <n> [--quiet]\n";
        return 1;
    }
    try {
        const long long limit = parse_limit(argv[1]);
        print_result(limit, timed_sieve(limit, !quiet && limit <= 1000), quiet);
    } catch (const std::exception& error) {
        std::cerr << "Error: " << error.what() << "\n";
        return 1;
    }
}
