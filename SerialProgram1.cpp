#include <chrono>
#include <iomanip>
#include <iostream>
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
            for (int multiple = p * p;
                 multiple <= n;
                 multiple += p)
            {
                isPrime[multiple] = false;
            }
        }
    }

    return isPrime;
}

int main()
{
    const std::vector<int> testSizes = {
        100000,
        1000000,
        10000000,
        100000000
    };

    std::cout << "Name        : T P Shivha Shakthiy\n";
    std::cout << "Roll Number : 2024BCD0073\n";
    std::cout << "----------------------------------------\n\n";

    std::cout << std::left
              << std::setw(15) << "N"
              << std::setw(18) << "Prime Count"
              << std::setw(20) << "Serial Time (ms)"
              << "\n";

    std::cout << std::string(53, '-') << "\n";

    for (int n : testSizes)
    {
        auto start =
            std::chrono::high_resolution_clock::now();

        std::vector<char> isPrime =
            serialSieve(n);

        auto end =
            std::chrono::high_resolution_clock::now();

        double serialMs =
            std::chrono::duration<double, std::milli>(
                end - start
            ).count();

        long long primeCount = 0;

        for (int number = 2;
             number <= n;
             ++number)
        {
            if (isPrime[number])
            {
                primeCount++;
            }
        }

        std::cout << std::left
                  << std::setw(15) << n
                  << std::setw(18) << primeCount
                  << std::setw(20)
                  << std::fixed
                  << std::setprecision(3)
                  << serialMs
                  << "\n";
    }

    return 0;
}
