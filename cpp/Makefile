CXX = g++
CXXFLAGS = -O2 -std=c++17
LDFLAGS_SERIAL =
LDFLAGS_OPENMP = -fopenmp

BIN_DIR = ../backend/bin

ifeq ($(OS),Windows_NT)
	EXT = .exe
else
	EXT =
endif

all: $(BIN_DIR)/sieve_serial$(EXT) $(BIN_DIR)/sieve_openmp$(EXT)

$(BIN_DIR):
	mkdir -p $(BIN_DIR)

$(BIN_DIR)/sieve_serial$(EXT): sieve_serial.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $< $(LDFLAGS_SERIAL)

$(BIN_DIR)/sieve_openmp$(EXT): sieve_openmp.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(LDFLAGS_OPENMP) -o $@ $< $(LDFLAGS_OPENMP)

clean:
	rm -f $(BIN_DIR)/sieve_serial$(EXT) $(BIN_DIR)/sieve_openmp$(EXT)

.PHONY: all clean
