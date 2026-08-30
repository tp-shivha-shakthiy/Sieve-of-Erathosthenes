cmake_minimum_required(VERSION 3.16)
project(SieveOfEratosthenes LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(OpenMP REQUIRED)

add_executable(sieve_serial sieve_serial.cpp)

add_executable(sieve_openmp sieve_openmp.cpp)
target_link_libraries(sieve_openmp OpenMP::OpenMP_CXX)

if(MSVC)
    target_compile_options(sieve_serial PRIVATE /W4)
    target_compile_options(sieve_openmp PRIVATE /W4)
else()
    target_compile_options(sieve_serial PRIVATE -Wall -Wextra)
    target_compile_options(sieve_openmp PRIVATE -Wall -Wextra)
endif()

add_custom_target(copy_bins ALL
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_SOURCE_DIR}/../backend/bin
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:sieve_serial> ${CMAKE_SOURCE_DIR}/../backend/bin/
    COMMAND ${CMAKE_COMMAND} -E copy $<TARGET_FILE:sieve_openmp> ${CMAKE_SOURCE_DIR}/../backend/bin/
    DEPENDS sieve_serial sieve_openmp
)
