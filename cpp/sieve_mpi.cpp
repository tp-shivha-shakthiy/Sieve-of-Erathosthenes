#include <mpi.h>

#include <algorithm>
#include <cmath>
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

std::vector<int> generate_base_primes(int limit) {
    const int root = static_cast<int>(std::sqrt(limit));
    std::vector<char> is_prime(root + 1, true);
    if (root >= 0) is_prime[0] = false;
    if (root >= 1) is_prime[1] = false;

    std::vector<int> base_primes;
    for (int p = 2; p <= root; ++p) {
        if (is_prime[p]) {
            base_primes.push_back(p);
            if (p <= root / p) {
                for (int multiple = p * p; multiple <= root; multiple += p) {
                    is_prime[multiple] = false;
                }
            }
        }
    }
    return base_primes;
}

void owned_range(int limit, int rank, int process_count, int& low, int& high) {
    const int candidate_count = limit - 1;  // Values in [2, limit].
    const int quotient = candidate_count / process_count;
    const int remainder = candidate_count % process_count;
    const int local_count = quotient + (rank < remainder ? 1 : 0);
    const int offset = rank * quotient + std::min(rank, remainder);

    low = 2 + offset;
    high = local_count == 0 ? low - 1 : low + local_count - 1;
}

std::vector<char> mark_owned_range(int low, int high, int limit,
                                   const std::vector<int>& base_primes,
                                   long long& local_prime_count) {
    const int local_size = high >= low ? high - low + 1 : 0;
    std::vector<char> is_prime(local_size, true);

    for (int p : base_primes) {
        long long first_multiple =
            std::max(static_cast<long long>(p) * p,
                     ((static_cast<long long>(low) + p - 1) / p) * p);
        for (long long multiple = first_multiple;
             multiple <= high && multiple <= limit;
             multiple += p) {
            is_prime[static_cast<int>(multiple) - low] = false;
        }
    }

    local_prime_count = 0;
    for (char value : is_prime) {
        local_prime_count += value != 0;
    }
    return is_prime;
}

void print_json(int limit, int process_count, long long prime_count, double elapsed_ms,
                int repetitions, const std::vector<char>& global_is_prime,
                bool return_primes, const std::vector<int>& rank_lows,
                const std::vector<int>& rank_highs,
                const std::vector<double>& rank_elapsed_ms) {
    std::cout << std::setprecision(12) << "{"
              << "\"algorithm\":\"mpi\"," 
              << "\"limit\":" << limit << ","
              << "\"num_processes\":" << process_count << ","
              << "\"prime_count\":" << prime_count << ","
              << "\"execution_time_ms\":" << elapsed_ms << ","
              << "\"average_per_run_ms\":" << elapsed_ms << ","
              << "\"timing_repetitions\":" << repetitions << ","
              << "\"ranks\":[";
    for (int rank = 0; rank < process_count; ++rank) {
        if (rank > 0) std::cout << ",";
        const int workload = rank_highs[rank] >= rank_lows[rank]
            ? rank_highs[rank] - rank_lows[rank] + 1 : 0;
        std::cout << "{\"rank\":" << rank
                  << ",\"low\":" << rank_lows[rank]
                  << ",\"high\":" << rank_highs[rank]
                  << ",\"workload\":" << workload
                  << ",\"execution_time_ms\":" << rank_elapsed_ms[rank]
                  << "}";
    }
    std::cout << "],"
              << "\"primes\":[";
    if (return_primes && limit <= 1000000) {
        bool first = true;
        for (int number = 2; number <= limit; ++number) {
            if (global_is_prime[number]) {
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
    int initialized = 0;
    MPI_Initialized(&initialized);
    if (!initialized) MPI_Init(&argc, &argv);

    int rank = 0;
    int process_count = 0;
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);
    MPI_Comm_size(MPI_COMM_WORLD, &process_count);

    int exit_code = 0;
    try {
        if (argc < 2 || argc > 5) {
            throw std::invalid_argument(
                "Usage: sieve_mpi <limit> [return_primes=1] [timing_repetitions=1] [debug=0]");
        }

        const int limit = parse_limit(argv[1]);
        const bool return_primes = argc >= 3 ? std::string(argv[2]) == "1" : true;
        const int repetitions = argc >= 4 ? parse_repetitions(argv[3]) : 1;
        const bool debug = argc >= 5 && std::string(argv[4]) == "1";
        int low = 0;
        int high = -1;
        owned_range(limit, rank, process_count, low, high);

        long long prime_count = 0;
        double total_elapsed = 0.0;
        double final_local_elapsed = 0.0;
        std::vector<char> final_local_primes;

        for (int run = 0; run < repetitions; ++run) {
            MPI_Barrier(MPI_COMM_WORLD);
            const double start = MPI_Wtime();

            std::vector<int> base_primes;
            if (rank == 0) base_primes = generate_base_primes(limit);
            int base_prime_count = static_cast<int>(base_primes.size());
            MPI_Bcast(&base_prime_count, 1, MPI_INT, 0, MPI_COMM_WORLD);
            if (rank != 0) base_primes.resize(base_prime_count);
            if (base_prime_count > 0) {
                MPI_Bcast(base_primes.data(), base_prime_count, MPI_INT, 0, MPI_COMM_WORLD);
            }

            long long local_prime_count = 0;
            std::vector<char> local_primes = mark_owned_range(
                low, high, limit, base_primes, local_prime_count);
            MPI_Reduce(&local_prime_count, &prime_count, 1, MPI_LONG_LONG,
                       MPI_SUM, 0, MPI_COMM_WORLD);

            double local_elapsed = MPI_Wtime() - start;
            double run_elapsed = 0.0;
            MPI_Reduce(&local_elapsed, &run_elapsed, 1, MPI_DOUBLE, MPI_MAX,
                       0, MPI_COMM_WORLD);
            if (rank == 0) total_elapsed += run_elapsed;
            if (run == repetitions - 1) {
                final_local_elapsed = local_elapsed;
                final_local_primes = std::move(local_primes);
            }
        }

        std::vector<int> rank_lows;
        std::vector<int> rank_highs;
        std::vector<double> rank_elapsed_ms;
        if (rank == 0) {
            rank_lows.resize(process_count);
            rank_highs.resize(process_count);
            rank_elapsed_ms.resize(process_count);
        }
        MPI_Gather(&low, 1, MPI_INT, rank == 0 ? rank_lows.data() : nullptr, 1,
                   MPI_INT, 0, MPI_COMM_WORLD);
        MPI_Gather(&high, 1, MPI_INT, rank == 0 ? rank_highs.data() : nullptr, 1,
                   MPI_INT, 0, MPI_COMM_WORLD);
        double final_local_elapsed_ms = final_local_elapsed * 1000.0;
        MPI_Gather(&final_local_elapsed_ms, 1, MPI_DOUBLE,
                   rank == 0 ? rank_elapsed_ms.data() : nullptr, 1, MPI_DOUBLE,
                   0, MPI_COMM_WORLD);

        if (debug) {
            std::cerr << "rank " << rank << " owns [" << low << ", " << high
                      << "]\n";
        }

        std::vector<char> global_is_prime;
        if (rank == 0 && return_primes && limit <= 1000000) {
            global_is_prime.resize(limit + 1, false);
        }
        if (return_primes && limit <= 1000000) {
            std::vector<int> receive_counts;
            std::vector<int> displacements;
            if (rank == 0) {
                receive_counts.resize(process_count);
                displacements.resize(process_count);
            }
            const int local_size = static_cast<int>(final_local_primes.size());
            MPI_Gather(&local_size, 1, MPI_INT,
                       rank == 0 ? receive_counts.data() : nullptr, 1, MPI_INT,
                       0, MPI_COMM_WORLD);
            if (rank == 0) {
                int displacement = 0;
                for (int process = 0; process < process_count; ++process) {
                    displacements[process] = displacement;
                    displacement += receive_counts[process];
                }
            }
            MPI_Gatherv(final_local_primes.data(), local_size, MPI_CHAR,
                        rank == 0 ? global_is_prime.data() + 2 : nullptr,
                        rank == 0 ? receive_counts.data() : nullptr,
                        rank == 0 ? displacements.data() : nullptr,
                        MPI_CHAR, 0, MPI_COMM_WORLD);
        }

        if (rank == 0) {
            print_json(limit, process_count, prime_count,
                       total_elapsed * 1000.0 / repetitions, repetitions,
                       global_is_prime, return_primes, rank_lows, rank_highs,
                       rank_elapsed_ms);
        }
    } catch (const std::exception& error) {
        if (rank == 0) std::cerr << "Invalid argument: " << error.what() << "\n";
        exit_code = 1;
    }

    MPI_Finalize();
    return exit_code;
}