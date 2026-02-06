# Odds Transition Manager

**Smooth view transitions for odds updates using View Transitions API**

---

## Overview

The Odds Transition Manager provides smooth, animated transitions when odds values change in the UI. It uses the View Transitions API for native browser transitions with fallback support.

---

## Features

- **View Transitions API**: Native browser transitions
- **Fallback Support**: Graceful degradation for unsupported browsers
- **Movement Indicators**: Visual feedback for odds direction (up/down/sideways)
- **Configurable**: Customizable duration and delays
- **Type-Safe**: Full TypeScript support

---

## Usage

### Basic Usage

```typescript
import { OddsTransitionManager } from '@/core/transitions';

const manager = new OddsTransitionManager();

await manager.executeGameUpdate(
  'game-123',
  [
    {
      gameId: 'game-123',
      bookmaker: 'circa',
      odds: -110,
      movement: 'up',
      previousOdds: -115
    }
  ],
  () => {
    // Update DOM with new odds
    updateOddsInDOM(updates);
  }
);
```

### With Custom Options

```typescript
const manager = new OddsTransitionManager({
  duration: 500,
  showMovement: true,
  postUpdateDelay: 100
});
```

### Check Support

```typescript
if (OddsTransitionManager.isSupported()) {
  // Use transitions
} else {
  // Fallback to immediate update
}
```

---

## API Reference

### OddsTransitionManager

#### Constructor

```typescript
constructor(options?: TransitionOptions)
```

**Options**:
- `duration?: number` - Transition duration in ms (default: 300)
- `showMovement?: boolean` - Enable movement indicators (default: true)
- `postUpdateDelay?: number` - Post-update delay in ms (default: 50)

#### Methods

##### executeGameUpdate

```typescript
async executeGameUpdate(
  gameId: string,
  updates: OddsUpdate[],
  updateCallback: () => void
): Promise<void>
```

Execute game update with smooth view transition.

**Parameters**:
- `gameId`: Game identifier
- `updates`: Array of odds updates
- `updateCallback`: Callback to execute DOM updates

**Returns**: Promise that resolves when transition completes

##### isSupported (static)

```typescript
static isSupported(): boolean
```

Check if View Transitions API is supported.

**Returns**: `true` if supported, `false` otherwise

##### getDuration

```typescript
getDuration(): number
```

Get transition duration in milliseconds.

**Returns**: Duration in milliseconds

---

## Types

### OddsUpdate

```typescript
interface OddsUpdate {
  gameId: string;
  bookmaker: string;
  odds: number;
  movement?: "up" | "down" | "sideways";
  previousOdds?: number;
  timestamp?: number;
}
```

### TransitionOptions

```typescript
interface TransitionOptions {
  duration?: number;
  showMovement?: boolean;
  postUpdateDelay?: number;
}
```

---

## CSS Classes

The manager adds/removes these CSS classes:

- `odds-updating` - Applied during transition preparation
- `odds-updated` - Applied after update completes
- `data-movement` - Set to "up", "down", or "sideways"

### Example CSS

```css
.odds-updating {
  opacity: 0.7;
  transition: opacity 0.3s;
}

.odds-updated {
  animation: pulse 0.3s;
}

[data-movement="up"] {
  color: green;
}

[data-movement="down"] {
  color: red;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

---

## View Transition Names

Each cell gets a unique view-transition name:

```
odds-{gameId}-{bookmaker}
```

Example: `odds-game-123-circa`

This allows the browser to track individual cells during transitions.

---

## Browser Support

- **Chrome/Edge**: ✅ Full support (View Transitions API)
- **Firefox**: ⚠️ Fallback (immediate update)
- **Safari**: ⚠️ Fallback (immediate update)

The manager automatically detects support and falls back gracefully.

---

## Performance

- **Transition Duration**: 300ms (configurable)
- **Post-Update Delay**: 50ms (configurable)
- **Memory**: Minimal (no persistent state)
- **CPU**: Low (native browser transitions)

---

## Integration Example

### React Component

```tsx
import { OddsTransitionManager } from '@/core/transitions';
import { useState, useCallback } from 'react';

function OddsTable({ gameId, odds }) {
  const [currentOdds, setCurrentOdds] = useState(odds);
  const manager = new OddsTransitionManager();

  const handleOddsUpdate = useCallback(async (updates) => {
    await manager.executeGameUpdate(
      gameId,
      updates,
      () => {
        setCurrentOdds(prev => ({
          ...prev,
          ...updates.reduce((acc, u) => {
            acc[u.bookmaker] = u.odds;
            return acc;
          }, {})
        }));
      }
    );
  }, [gameId, manager]);

  return (
    <div>
      {Object.entries(currentOdds).map(([bookmaker, odds]) => (
        <div
          key={bookmaker}
          id={`cell-${gameId}-${bookmaker}`}
          className="odds-cell"
        >
          {odds}
        </div>
      ))}
    </div>
  );
}
```

---

## Best Practices

1. **Batch Updates**: Group multiple updates in a single `executeGameUpdate` call
2. **Unique IDs**: Ensure cell elements have unique IDs matching pattern `cell-{gameId}-{bookmaker}`
3. **CSS Transitions**: Add CSS transitions for smooth animations
4. **Error Handling**: Wrap in try/catch for production
5. **Performance**: Avoid excessive transitions (debounce rapid updates)

---

## Future Enhancements

1. **Transition Presets**: Predefined transition styles
2. **Custom Animations**: Configurable animation curves
3. **Group Transitions**: Animate multiple games simultaneously
4. **Accessibility**: Respect `prefers-reduced-motion`
5. **Metrics**: Track transition performance

---

**Status**: Production-ready  
**Version**: v0.1.0  
**Browser Support**: Chrome/Edge (full), Firefox/Safari (fallback)
