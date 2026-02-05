#include <stdio.h>

int hello(void) {
    printf("Hello from C compiled with bun:ffi!\n");
    printf("This demonstrates C_INCLUDE_PATH and LIBRARY_PATH support.\n");
    return 42;
}
