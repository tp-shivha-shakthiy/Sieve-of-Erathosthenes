#include <algorithm>
#include <cmath>
#include <iomanip>
#include <iostream>
#include <omp.h>
#include <vector>
std::vector<char> serialSieve(int n)
{
    std::vector<char> isPrime(n + 1, true);
    isPrime[0] = false;
    isPrime[1] = false;

    for (int p = 2; p <= n / p; ++p)
    {
        if (isPrime[p])
        {
            for (int multiple = p * p; multiple <= n; multiple += p)
            {
                isPrime[multiple] = false;
            }
        }
    }
    return isPrime;
}
// Serial preprocessing for the parallel segmented sieve.
std::vector<int> generateBasePrimes(int n)
{
    int root = static_cast<int>(std::sqrt(n));

    std::vector<char> baseIsPrime(root + 1, true);
    baseIsPrime[0] = false;

    if (root >= 1)
        baseIsPrime[1] = false;

    std::vector<int> basePrimes;

    for (int p = 2; p <= root; ++p)
    {
        if (baseIsPrime[p])
        {
            basePrimes.push_back(p);

            if (p <= root / p)
            {
                for (int multiple = p * p;
                     multiple <= root;
                     multiple += p)
                {
                    baseIsPrime[multiple] = false;
                }
            }
        }
    }

    return basePrimes;
}

long long parallelSieve(int n, int threads)
{
    // RAW dependency: base primes are generated before parallel marking.
    std::vector<int> basePrimes = generateBasePrimes(n);

    std::vector<char> isPrime(n + 1, true);
    isPrime[0] = false;
    isPrime[1] = false;

    // Domain decomposition.
    const int blockSize = 10000;
    const int blockCount = (n - 1 + blockSize - 1) / blockSize;

    omp_set_num_threads(threads);

    // Parallel region + work sharing + static scheduling.
#pragma omp parallel for default(none) \
    shared(n, blockSize, blockCount, basePrimes, isPrime) \
    schedule(static)
    for (int block = 0; block < blockCount; ++block)
    {
        int low = 2 + block * blockSize;
        int high = std::min(n, low + blockSize - 1);

        // Each thread writes only to its own block, avoiding WAW races.
        for (int p : basePrimes)
        {
            long long firstMultiple =
                ((static_cast<long long>(low) + p - 1) / p) * p;

            long long pSquared =
                static_cast<long long>(p) * p;

            firstMultiple =
                std::max(firstMultiple, pSquared);

            for (long long multiple = firstMultiple;
                 multiple <= high;
                 multiple += p)
            {
                isPrime[static_cast<int>(multiple)] = false;
            }
        }
    }

    long long primeCount = 0;

    // Parallel reduction.
#pragma omp parallel for default(none) \
    shared(n, isPrime) \
    reduction(+ : primeCount) \
    schedule(static)
    for (int number = 2; number <= n; ++number)
    {
        if (isPrime[number])
        {
            primeCount++;
        }
    }

    return primeCount;
}

int main()
{
    const std::vector<int> testSizes = {
        100000,
        1000000,
        10000000,
        100000000
    };

    const std::vector<int> threadCounts = {
        1,
        2,
        4,
        8
    };

    std::cout << "Name        : T P Shivha Shakthiy\n";
    std::cout << "Roll Number : 2024BCD0073\n";
    std::cout << "----------------------------------------\n\n";

    std::cout << std::left
              << std::setw(12) << "N"
              << std::setw(6)  << "P"
              << std::setw(16) << "Prime Count"
              << std::setw(16) << "Serial ms"
              << std::setw(16) << "OpenMP ms"
              << std::setw(12) << "Speedup"
              << std::setw(14) << "Efficiency"
              << "\n";

    std::cout << std::string(92, '-') << "\n";

    for (int n : testSizes)
    {
        double serialStart = omp_get_wtime();

        std::vector<char> serialResult =
            serialSieve(n);

        double serialEnd = omp_get_wtime();

        double serialMs =
            (serialEnd - serialStart) * 1000.0;

        long long serialPrimeCount = 0;

        for (int i = 2; i <= n; ++i)
        {
            if (serialResult[i])
            {
                serialPrimeCount++;
            }
        }

        for (int threads : threadCounts)
        {
            double parallelStart = omp_get_wtime();

            long long parallelPrimeCount =
                parallelSieve(n, threads);

            double parallelEnd = omp_get_wtime();

            double parallelMs =
                (parallelEnd - parallelStart) * 1000.0;

            double speedup =
                parallelMs > 0.0
                    ? serialMs / parallelMs
                    : 0.0;

            double efficiency =
                speedup / threads;

            if (serialPrimeCount != parallelPrimeCount)
            {
                std::cerr
                    << "\nERROR: Serial and parallel results differ for N = "
                    << n
                    << ", P = "
                    << threads
                    << "\n";

                return 1;
            }

            std::cout << std::left
                      << std::setw(12) << n
                      << std::setw(6)  << threads
                      << std::setw(16) << parallelPrimeCount
                      << std::setw(16) << std::fixed << std::setprecision(3)
                      << serialMs
                      << std::setw(16) << parallelMs
                      << std::setw(12) << speedup
                      << std::setw(14) << efficiency * 100.0
                      << "\n";
        }
    }
    return 0;
}
