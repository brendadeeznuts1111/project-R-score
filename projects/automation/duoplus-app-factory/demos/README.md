# 🎮 Demo Scripts

Demonstration scripts showcasing Nebula-Flow™ features and capabilities.

## Available Demos

### Atlas Demo
**File**: `demo-atlas.ts`

Demonstrates device inventory management and lifecycle tracking.

```bash
bun run demo-atlas
```

**Shows**:
- Device registration
- Inventory management
- Lifecycle state transitions
- Device queries and filtering

### Device Commander Demo
**File**: `demo-device-commander.ts`

Interactive device fleet management demonstration.

```bash
bun run demo-device-commander
```

**Features**:
- Device discovery
- Command execution
- Status monitoring
- Fleet operations

### Filtering Demo
**File**: `demo-filtering.ts`

Advanced filtering and search capabilities.

```bash
bun run demo-filtering
```

**Demonstrates**:
- Complex queries
- Multi-field filtering
- Sorting and pagination
- Result aggregation

### Web App Demo
**File**: `demo-web-app.ts`

Web dashboard demonstration with sample data.

```bash
bun run demo-web-app
```

**Includes**:
- Dashboard initialization
- Sample device data
- Mock metrics
- UI interactions

## Running Demos

### Run All Demos
```bash
for demo in demo-atlas demo-device-commander demo-filtering demo-web-app; do
  echo "Running $demo..."
  bun run $demo
  echo "---"
done
```

### Run Specific Demo
```bash
bun run demo-atlas
```

### Run with Custom Options
```bash
bun run demo-atlas --verbose
bun run demo-device-commander --port 3001
```

## Demo Output

Each demo generates:
- Console output with results
- Sample data files
- Performance metrics
- Status reports

## Creating New Demos

### Template
```typescript
// demos/demo-my-feature.ts
import { MyFeature } from '../src/features/my-feature';

async function main() {
  console.log('🎮 My Feature Demo');
  
  const feature = new MyFeature();
  
  // Demo logic here
  
  console.log('✅ Demo complete');
}

main().catch(console.error);
```

### Add to package.json
```json
{
  "scripts": {
    "demo-my-feature": "bun run demos/demo-my-feature.ts"
  }
}
```

## Demo Data

Demos use sample data from:
- `data/` - Sample datasets
- `exports/` - Generated exports
- Mock APIs and services

## Performance

- Fast execution (< 5 seconds)
- Minimal resource usage
- No external dependencies
- Standalone execution

## Educational Value

Demos are designed to:
- Show feature capabilities
- Demonstrate best practices
- Provide code examples
- Enable learning by example

## Troubleshooting

### Demo Fails to Run
```bash
# Check dependencies
bun install

# Run with verbose output
bun run demo-atlas --verbose

# Check logs
cat logs/*.jsonl
```

### Performance Issues
- Close other applications
- Check system resources
- Review logs for errors

## Next Steps

After running demos:
1. Review the code in `demos/`
2. Check the generated output
3. Explore the source code
4. Try modifying the demos

---

**Version**: 3.5.0

