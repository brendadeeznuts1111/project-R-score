;; WebAssembly module for hardware-accelerated config operations
;; Uses SIMD instructions for batch updates and atomic operations

(module
  ;; Memory layout for 13-byte config (16 bytes with padding)
  (memory (export "memory") 1)
  
  ;; Config field offsets
  (global $OFFSET_VERSION i32 (i32.const 0))
  (global $OFFSET_REGISTRY_HASH i32 (i32.const 4))
  (global $OFFSET_FEATURE_FLAGS i32 (i32.const 8))
  (global $OFFSET_TERMINAL_MODE i32 (i32.const 12))
  (global $OFFSET_ROWS i32 (i32.const 13))
  (global $OFFSET_COLS i32 (i32.const 14))
  
  ;; SIMD operations for batch updates
  (func $batch_update_simd (export "batchUpdateSimd") (param $updates i32) (param $count i32) (result i32)
    (local $i i32)
    (local $field_offset i32)
    (local $value i32)
    (local $mask v128)
    (local $current v128)
    (local $new_val v128)
    
    ;; Load current config state into SIMD register
    (set_local $current (v128.load (i32.const 0)))
    
    ;; Process each update
    (loop $update_loop
      ;; Check if we have more updates
      (local.get $i)
      (local.get $count)
      i32.lt_u
      
      (if
        (then
          ;; Load field offset and value
          (set_local $field_offset 
            (i32.load 
              (i32.add 
                (local.get $updates) 
                (i32.mul (local.get $i) (i32.const 8))
              )
            )
          )
          (set_local $value 
            (i32.load 
              (i32.add 
                (local.get $updates) 
                (i32.add 
                  (i32.mul (local.get $i) (i32.const 8))
                  (i32.const 4)
                )
              )
            )
          )
          
          ;; Create mask for the field
          (set_local $mask 
            (call $create_field_mask (local.get $field_offset))
          )
          
          ;; Create new value vector
          (set_local $new_val 
            (call $create_value_vector (local.get $field_offset) (local.get $value))
          )
          
          ;; Apply update: new = (current & ~mask) | new_val
          (set_local $current 
            (v128.or 
              (v128.and (local.get $current) (v128.not (local.get $mask)))
              (local.get $new_val)
            )
          )
          
          ;; Increment counter
          (local.set $i (i32.add (local.get $i) (i32.const 1)))
          (br $update_loop)
        )
      )
    )
    
    ;; Store updated config
    (v128.store (i32.const 0) (local.get $current))
    
    ;; Return success
    (i32.const 1)
  )
  
  ;; Create SIMD mask for specific field
  (func $create_field_mask (param $offset i32) (result v128)
    (local $mask v128)
    
    ;; Initialize with zeros
    (set_local $mask (v128.const i32x4 0 0 0 0))
    
    ;; Set mask based on field offset
    (local.get $offset)
    (i32.const 0)
    i32.eq
    (if 
      (then
        ;; Version field (1 byte)
        (set_local $mask (v128.const i32x4 0xFF 0 0 0))
        (return (local.get $mask))
      )
    )
    
    (local.get $offset)
    (i32.const 4)
    i32.eq
    (if 
      (then
        ;; Registry hash field (4 bytes)
        (set_local $mask (v128.const i32x4 0x00 0xFFFFFFFF 0 0))
        (return (local.get $mask))
      )
    )
    
    (local.get $offset)
    (i32.const 8)
    i32.eq
    (if 
      (then
        ;; Feature flags field (4 bytes)
        (set_local $mask (v128.const i32x4 0 0 0xFFFFFFFF 0))
        (return (local.get $mask))
      )
    )
    
    (local.get $offset)
    (i32.const 12)
    i32.eq
    (if 
      (then
        ;; Terminal mode field (1 byte)
        (set_local $mask (v128.const i32x4 0 0 0 0xFF))
        (return (local.get $mask))
      )
    )
    
    ;; Default: no mask
    (v128.const i32x4 0 0 0 0)
  )
  
  ;; Create SIMD vector with value at correct position
  (func $create_value_vector (param $offset i32) (param $value i32) (result v128)
    (local.get $offset)
    (i32.const 0)
    i32.eq
    (if 
      (then
        ;; Version field
        (v128.const i32x4 0 0 0 0)
        (return (v128.const i32x4 (local.get $value) 0 0 0))
      )
    )
    
    (local.get $offset)
    (i32.const 4)
    i32.eq
    (if 
      (then
        ;; Registry hash field
        (v128.const i32x4 0 (local.get $value) 0 0)
      )
    )
    
    (local.get $offset)
    (i32.const 8)
    i32.eq
    (if 
      (then
        ;; Feature flags field
        (v128.const i32x4 0 0 (local.get $value) 0)
      )
    )
    
    (local.get $offset)
    (i32.const 12)
    i32.eq
    (if 
      (then
        ;; Terminal mode field
        (v128.const i32x4 0 0 0 (local.get $value))
      )
    )
    
    ;; Default: zero vector
    (v128.const i32x4 0 0 0 0)
  )
  
  ;; Atomic compare-and-swap using WebAssembly atomic operations
  (func $atomic_compare_exchange (export "atomicCompareExchange") 
    (param $offset i32) (param $expected i32) (param $desired i32) (result i32)
    (local $addr i32)
    
    ;; Calculate address
    (set_local $addr (local.get $offset))
    
    ;; Perform atomic compare-exchange
    (i32.atomic.rmw.cmpxchg 
      (local.get $addr) 
      (local.get $expected) 
      (local.get $desired)
    )
  )
  
  ;; Initialize config with default values
  (func $initialize_config (export "initializeConfig") (result i32)
    ;; Set version
    (i32.store8 (global.get $OFFSET_VERSION) (i32.const 1))
    
    ;; Set registry hash
    (i32.store (global.get $OFFSET_REGISTRY_HASH) (i32.const 0x12345678))
    
    ;; Set feature flags
    (i32.store (global.get $OFFSET_FEATURE_FLAGS) (i32.const 0x00000007))
    
    ;; Set terminal mode
    (i32.store8 (global.get $OFFSET_TERMINAL_MODE) (i32.const 1))
    
    ;; Set rows
    (i32.store8 (global.get $OFFSET_ROWS) (i32.const 48))
    
    ;; Set cols
    (i32.store16 (global.get $OFFSET_COLS) (i32.const 80))
    
    (i32.const 1)
  )
  
  ;; Get config field value
  (func $get_field (export "getField") (param $offset i32) (result i32)
    (local.get $offset)
    (i32.const 0)
    i32.eq
    (if 
      (then
        (i32.load8_u (global.get $OFFSET_VERSION))
        (return)
      )
    )
    
    (local.get $offset)
    (i32.const 4)
    i32.eq
    (if 
      (then
        (i32.load (global.get $OFFSET_REGISTRY_HASH))
        (return)
      )
    )
    
    (local.get $offset)
    (i32.const 8)
    i32.eq
    (if 
      (then
        (i32.load (global.get $OFFSET_FEATURE_FLAGS))
        (return)
      )
    )
    
    (local.get $offset)
    (i32.const 12)
    i32.eq
    (if 
      (then
        (i32.load8_u (global.get $OFFSET_TERMINAL_MODE))
        (return)
      )
    )
    
    ;; Default: return 0
    (i32.const 0)
  )
)
