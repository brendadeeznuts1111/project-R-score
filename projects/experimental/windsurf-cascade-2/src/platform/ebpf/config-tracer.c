// eBPF program for tracing 13-byte config changes at kernel level
// This attaches to the config manager and traces all modifications

#include <linux/bpf.h>
#include <bpf/bpf_helpers.h>

// Config change event structure
struct config_event {
    u64 timestamp;
    u32 pid;
    u32 field;
    u32 old_value;
    u32 new_value;
    char field_name[16];
};

// BPF map for events
struct {
    __uint(type, BPF_MAP_TYPE_PERF_EVENT_ARRAY);
    __uint(key_size, sizeof(u32));
    __uint(value_size, sizeof(u32));
} config_events SEC(".maps");

// BPF map for config state
struct {
    __uint(type, BPF_MAP_TYPE_ARRAY);
    __uint(max_entries, 6);
    __type(key, u32);
    __type(value, u32);
} config_state SEC(".maps");

// Field indices matching the JavaScript implementation
enum config_fields {
    FIELD_VERSION = 0,
    FIELD_REGISTRY_HASH = 1,
    FIELD_FEATURE_FLAGS = 2,
    FIELD_TERMINAL_MODE = 3,
    FIELD_ROWS = 4,
    FIELD_COLS = 5
};

// Trace config field updates
SEC("uprobe/config_update")
int trace_config_update(struct pt_regs *ctx) {
    struct config_event event = {};
    u32 field_id;
    u32 old_value, new_value;
    
    // Get field ID from register (platform-specific)
    field_id = PT_REGS_PARM1(ctx);
    old_value = PT_REGS_PARM2(ctx);
    new_value = PT_REGS_PARM3(ctx);
    
    // Validate field ID
    if (field_id >= 6) {
        return 0;
    }
    
    // Get current config state
    u32 *current_value = bpf_map_lookup_elem(&config_state, &field_id);
    if (!current_value) {
        return 0;
    }
    
    // Verify old value matches (atomic check)
    if (*current_value != old_value) {
        return 0; // CAS failed
    }
    
    // Update state
    bpf_map_update_elem(&config_state, &field_id, &new_value, BPF_ANY);
    
    // Fill event structure
    event.timestamp = bpf_ktime_get_ns();
    event.pid = bpf_get_current_pid_tgid() >> 32;
    event.field = field_id;
    event.old_value = old_value;
    event.new_value = new_value;
    
    // Set field name
    switch (field_id) {
        case FIELD_VERSION:
            __builtin_memcpy(event.field_name, "version", 7);
            break;
        case FIELD_REGISTRY_HASH:
            __builtin_memcpy(event.field_name, "registryHash", 12);
            break;
        case FIELD_FEATURE_FLAGS:
            __builtin_memcpy(event.field_name, "featureFlags", 12);
            break;
        case FIELD_TERMINAL_MODE:
            __builtin_memcpy(event.field_name, "terminalMode", 12);
            break;
        case FIELD_ROWS:
            __builtin_memcpy(event.field_name, "rows", 5);
            break;
        case FIELD_COLS:
            __builtin_memcpy(event.field_name, "cols", 5);
            break;
    }
    
    // Send event to userspace
    bpf_perf_event_output(ctx, &config_events, BPF_F_CURRENT_CPU, &event, sizeof(event));
    
    return 0;
}

// Initialize config state
SEC("syscall/init_config")
int init_config_state(struct pt_regs *ctx) {
    u32 key;
    u32 value;
    
    // Initialize with default values
    for (key = 0; key < 6; key++) {
        switch (key) {
            case FIELD_VERSION:
                value = 1;
                break;
            case FIELD_REGISTRY_HASH:
                value = 0x12345678;
                break;
            case FIELD_FEATURE_FLAGS:
                value = 0x00000007;
                break;
            case FIELD_TERMINAL_MODE:
                value = 1;
                break;
            case FIELD_ROWS:
                value = 48;
                break;
            case FIELD_COLS:
                value = 80;
                break;
        }
        bpf_map_update_elem(&config_state, &key, &value, BPF_ANY);
    }
    
    return 0;
}

// License
char _license[] SEC("license") = "GPL";
