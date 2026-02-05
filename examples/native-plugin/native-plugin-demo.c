// native-plugin-demo.c - Native Bun Plugin Example
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include <node_api.h>

// Global counter for tracking files
static int file_count = 0;

// Native plugin lifecycle hook: onBeforeParse
// This runs on any thread before a file is parsed by Bun's bundler
static napi_value onBeforeParse(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_status status;
    
    // Get arguments: path and content
    status = napi_get_cb_info(env, info, &argc, args, NULL, NULL);
    if (status != napi_ok) return NULL;
    
    // Get file path
    size_t path_len;
    status = napi_get_value_string_utf8(env, args[0], NULL, 0, &path_len);
    if (status != napi_ok) return NULL;
    
    char* path = malloc(path_len + 1);
    status = napi_get_value_string_utf8(env, args[0], path, path_len + 1, &path_len);
    
    // Get file content length
    size_t content_len;
    status = napi_get_value_string_utf8(env, args[1], NULL, 0, &content_len);
    
    file_count++;
    
    printf("🔍 Native Plugin - File #%d: %.*s (%zu bytes)\n", 
           file_count, (int)path_len, path, content_len);
    
    // Quick analysis without UTF-8 -> UTF-16 conversion
    if (strstr(path, ".ts") != NULL) {
        printf("   📝 TypeScript file detected\n");
    } else if (strstr(path, ".js") != NULL) {
        printf("   📜 JavaScript file detected\n");
    }
    
    // Look for import patterns directly in UTF-8
    char* content = malloc(content_len + 1);
    status = napi_get_value_string_utf8(env, args[1], content, content_len + 1, &content_len);
    
    int import_count = 0;
    char* pos = content;
    while ((pos = strstr(pos, "import ")) != NULL) {
        import_count++;
        pos += 7; // Skip "import "
    }
    
    if (import_count > 0) {
        printf("   📦 Found %d import(s)\n", import_count);
    }
    
    free(path);
    free(content);
    
    // Return undefined (no modification to the file)
    return NULL;
}

// Module initialization
static napi_value Init(napi_env env, napi_value exports) {
    napi_status status;
    napi_value fn;
    
    // Export the onBeforeParse hook
    status = napi_create_function(env, NULL, 0, onBeforeParse, NULL, &fn);
    if (status != napi_ok) return NULL;
    
    status = napi_set_named_property(env, exports, "onBeforeParse", fn);
    if (status != napi_ok) return NULL;
    
    printf("🚀 Native plugin loaded successfully!\n");
    printf("⚡ Running on native threads - no UTF-8 conversion overhead!\n");
    
    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)
