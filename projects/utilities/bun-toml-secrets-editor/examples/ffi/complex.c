#include <stdio.h>
#include <mycustom.h>  // This header will be found via C_INCLUDE_PATH

// This function demonstrates linking with external libraries
// that are found via LIBRARY_PATH
extern int external_function(void);

int complex_example(void) {
    printf("Complex example with custom headers and libraries\n");
    
    // Call function from external library
    int external_result = external_function();
    printf("External library function returned: %d\n", external_result);
    
    return external_result + 100;
}
