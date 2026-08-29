CXX = g++
CXXFLAGS = -O2 -std=c++17
LDFLAGS_SERIAL =
LDFLAGS_OPENMP = -fopenmp

BIN_DIR = ../backend/bin

ifeq ($(OS),Windows_NT)
EXT = .exe
MKDIR_BIN = if not exist "$(BIN_DIR)" mkdir "$(BIN_DIR)"
REMOVE_BIN = if exist "$(BIN_DIR)\\sieve_serial$(EXT)" del /Q "$(BIN_DIR)\\sieve_serial$(EXT)"
REMOVE_OPENMP_BIN = if exist "$(BIN_DIR)\\sieve_openmp$(EXT)" del /Q "$(BIN_DIR)\\sieve_openmp$(EXT)"
else
EXT =
MKDIR_BIN = mkdir -p $(BIN_DIR)
REMOVE_BIN = rm -f $(BIN_DIR)/sieve_serial$(EXT)
REMOVE_OPENMP_BIN = rm -f $(BIN_DIR)/sieve_openmp$(EXT)
endif

all: $(BIN_DIR)/sieve_serial$(EXT) $(BIN_DIR)/sieve_openmp$(EXT)

$(BIN_DIR):
	$(MKDIR_BIN)

$(BIN_DIR)/sieve_serial$(EXT): sieve_serial.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) -o $@ $< $(LDFLAGS_SERIAL)

$(BIN_DIR)/sieve_openmp$(EXT): sieve_openmp.cpp | $(BIN_DIR)
	$(CXX) $(CXXFLAGS) $(LDFLAGS_OPENMP) -o $@ $< $(LDFLAGS_OPENMP)

clean:
	$(REMOVE_BIN)
	$(REMOVE_OPENMP_BIN)

.PHONY: all clean
