# Fire22 Terminal UI - Accessibility Compliance Checklist

A comprehensive checklist for ensuring WCAG 2.1 AA compliance and beyond for the
Fire22 Terminal UI system.

## Quick Reference

| Level | Status | Requirement              |
| ----- | ------ | ------------------------ |
| A     | ✅     | Keyboard accessibility   |
| A     | ✅     | Color not sole indicator |
| A     | ✅     | Form labels              |
| AA    | ✅     | Color contrast 4.5:1     |
| AA    | ✅     | Resize text 200%         |
| AAA   | ⚠️     | Color contrast 7:1       |
| AAA   | ⚠️     | Context-sensitive help   |

## WCAG 2.1 Level A Compliance

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (Level A)

- [ ] **Images**: All images have appropriate alt text

  ```html
  <!-- Good -->
  `&lt;img src="chart.png" alt="CPU usage increased 15% over last hour"&gt;`

  <!-- Bad -->
  <img src="chart.png" alt="chart" />
  ```

- [ ] **Decorative images**: Use empty alt="" or aria-hidden="true"
  ```html
  <!-- Decorative terminal decoration -->
  <span aria-hidden="true">🔥</span>
  ```
- [ ] **Complex images**: Provide detailed descriptions
  ```html
  <img
    src="performance-chart.png"
    alt="Performance chart"
    aria-describedby="chart-desc"
  />
  <div id="chart-desc" class="sr-only">
    Performance chart showing CPU usage at 67%, memory at 45%, and disk at 23%
  </div>
  ```

### 1.2 Time-based Media

#### 1.2.1 Audio-only and Video-only (Level A)

- [ ] **Auto-playing content**: No auto-playing audio/video > 3 seconds
- [ ] **Background sounds**: Provide controls to pause/stop

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (Level A)

- [ ] **Semantic structure**: Use proper HTML elements
  ```html
  <!-- Good -->
  <table class="terminal-table__table">
    <caption>
      System Performance Metrics
    </caption>
    <thead>
      <tr>
        <th scope="col">Metric</th>
        <th scope="col">Value</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
  </table>
  ```
- [ ] **Headings**: Proper heading hierarchy (h1 → h2 → h3)
  ```html
  `&lt;h1&gt;`Fire22 Dashboard`&lt;/h1&gt;` `&lt;h2&gt;`Performance
  Metrics`&lt;/h2&gt;` `&lt;h3&gt;`CPU Usage`&lt;/h3&gt;` `&lt;h3&gt;`Memory
  Usage`&lt;/h3&gt;`
  ```
- [ ] **Lists**: Use ul/ol for grouped content
  ```html
  <ul>
    <li>Active Sessions: 1,247</li>
    <li>Response Time: 142ms</li>
    <li>Uptime: 99.94%</li>
  </ul>
  ```

#### 1.3.2 Meaningful Sequence (Level A)

- [ ] **Reading order**: Content makes sense when linearized
- [ ] **Tab order**: Logical focus progression
  ```html
  <!-- Use tabindex to control order if needed -->
  `&lt;button tabindex="1"&gt;`Primary Action</button>
  `&lt;button tabindex="2"&gt;`Secondary Action</button>
  ```

#### 1.3.3 Sensory Characteristics (Level A)

- [ ] **Instructions**: Don't rely solely on shape, color, or position

  ```html
  <!-- Good -->
  <p>Click the green "Start" button below to begin</p>

  <!-- Bad -->
  <p>Click the green button below</p>
  ```

### 1.4 Distinguishable

#### 1.4.1 Use of Color (Level A)

- [ ] **Color independence**: Information not conveyed by color alone

  ```html
  <!-- Good: Uses icon + color -->
  <span class="status-success">
    <span aria-hidden="true">✅</span>
    Success
  </span>

  <!-- Good: Uses text + color -->
  <span style="color: red;">Error: Invalid input</span>
  ```

#### 1.4.2 Audio Control (Level A)

- [ ] **Background audio**: User can pause/stop/control volume

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (Level A)

- [ ] **Full keyboard access**: All functionality available via keyboard
- [ ] **No keyboard trap**: Users can navigate away from any element

  ```javascript
  // Test: Tab through all interactive elements
  const interactiveElements = document.querySelectorAll(
    'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  // Ensure each element can receive and lose focus
  interactiveElements.forEach(el => {
    el.addEventListener('focus', () => console.log('Focused:', el));
  });
  ```

#### 2.1.2 No Keyboard Trap (Level A)

- [ ] **Modal focus management**: Focus trapped within modals, but can exit

  ```javascript
  class ModalFocusTrap {
    constructor(modal) {
      this.modal = modal;
      this.focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      this.firstFocusable = this.focusableElements[0];
      this.lastFocusable =
        this.focusableElements[this.focusableElements.length - 1];
    }

    handleTab(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === this.firstFocusable) {
          e.preventDefault();
          this.lastFocusable.focus();
        } else if (
          !e.shiftKey &&
          document.activeElement === this.lastFocusable
        ) {
          e.preventDefault();
          this.firstFocusable.focus();
        }
      } else if (e.key === 'Escape') {
        this.closeModal();
      }
    }
  }
  ```

### 2.2 Enough Time

#### 2.2.1 Timing Adjustable (Level A)

- [ ] **Time limits**: User can extend, adjust, or turn off time limits
- [ ] **Session timeouts**: Warn users before session expires

#### 2.2.2 Pause, Stop, Hide (Level A)

- [ ] **Moving content**: User can pause animations/auto-updating content
  ```html
  <button onclick="pauseAnimations()" aria-label="Pause animations">
    ⏸️ Pause
  </button>
  ```

### 2.3 Seizures and Physical Reactions

#### 2.3.1 Three Flashes or Below Threshold (Level A)

- [ ] **Flashing content**: No more than 3 flashes per second
- [ ] **Large flash areas**: Avoid flashing in large areas

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (Level A)

- [ ] **Skip links**: Provide skip navigation links

  ```html
  <a href="#main-content" class="skip-nav">Skip to main content</a>
  <a href="#navigation" class="skip-nav">Skip to navigation</a>

  <style>
    .skip-nav {
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--accent);
      color: white;
      padding: 8px;
      text-decoration: none;
      opacity: 0;
    }

    .skip-nav:focus {
      top: 6px;
      opacity: 1;
    }
  </style>
  ```

#### 2.4.2 Page Titled (Level A)

- [ ] **Page titles**: Descriptive and unique page titles
  ```html
  <title>Performance Dashboard - Fire22 Terminal UI</title>
  ```

#### 2.4.3 Focus Order (Level A)

- [ ] **Logical focus order**: Focus moves in meaningful sequence
  ```html
  <!-- Good: Natural tab order -->
  <form>
    <input type="text" placeholder="Name" /> `&lt;!-- Tab 1 --&gt;`
    <input type="email" placeholder="Email" /> `&lt;!-- Tab 2 --&gt;`
    <button type="submit">Submit</button> `&lt;!-- Tab 3 --&gt;`
  </form>
  ```

#### 2.4.4 Link Purpose (Level A)

- [ ] **Descriptive links**: Link purpose clear from text or context

  ```html
  <!-- Good -->
  <a href="/docs/api">API Documentation</a>

  <!-- Bad -->
  <a href="/docs/api">Click here</a>

  <!-- Good with context -->
  <p>Learn more about our API:</p>
  <a href="/docs/api">Documentation</a>
  ```

### 3.1 Readable

#### 3.1.1 Language of Page (Level A)

- [ ] **Page language**: HTML lang attribute set
  ```html
  <html lang="en"></html>
  ```

### 3.2 Predictable

#### 3.2.1 On Focus (Level A)

- [ ] **Focus changes**: No unexpected context changes on focus
- [ ] **Predictable interactions**: Interface behaves consistently

#### 3.2.2 On Input (Level A)

- [ ] **Input changes**: No unexpected context changes on input

  ```javascript
  // Bad: Auto-submitting on input
  input.addEventListener('input', () => form.submit());

  // Good: Explicit submission
  button.addEventListener('click', () => form.submit());
  ```

### 3.3 Input Assistance

#### 3.3.1 Error Identification (Level A)

- [ ] **Error detection**: Errors clearly identified and described
  ```html
  <input
    type="email"
    aria-describedby="email-error"
    aria-invalid="true"
    required
  />
  <div id="email-error" role="alert">Please enter a valid email address</div>
  ```

#### 3.3.2 Labels or Instructions (Level A)

- [ ] **Form labels**: All form controls have labels

  ```html
  <!-- Good: Explicit label -->
  <label for="agent-id">Agent ID</label>
  <input type="text" id="agent-id" required />

  <!-- Good: Implicit label -->
  <label>
    Agent ID
    <input type="text" required />
  </label>

  <!-- Good: ARIA label -->
  <input type="search" aria-label="Search agents" placeholder="Search..." />
  ```

## WCAG 2.1 Level AA Compliance

### 1.4 Distinguishable

#### 1.4.3 Contrast (Minimum) (Level AA)

- [ ] **Normal text**: 4.5:1 contrast ratio
- [ ] **Large text**: 3:1 contrast ratio (18pt+ or 14pt+ bold)
- [ ] **Testing tools**: Use color contrast analyzers
  ```css
  /* Fire22 compliant colors */
  :root {
    --text-on-dark: #f0f6fc; /* 13.64:1 on #0d1117 */
    --fire-on-dark: #ff6b35; /* 4.52:1 on #0d1117 */
    --accent-on-dark: #58a6ff; /* 8.52:1 on #0d1117 */
  }
  ```

#### 1.4.4 Resize Text (Level AA)

- [ ] **200% zoom**: Text can be resized to 200% without horizontal scrolling

  ```css
  /* Use relative units */
  .terminal-text {
    font-size: 1rem; /* Scales with user preferences */
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .terminal-card {
      padding: 1rem; /* Scales appropriately */
    }
  }
  ```

#### 1.4.5 Images of Text (Level AA)

- [ ] **Text as images**: Avoid using images for text content

  ```html
  <!-- Good: Use actual text -->
  `&lt;h1 class="terminal-title"&gt;`Fire22 Dashboard`&lt;/h1&gt;`

  <!-- Bad: Image of text -->
  `&lt;img src="title.png" alt="Fire22 Dashboard"&gt;`
  ```

### 2.4 Navigable

#### 2.4.5 Multiple Ways (Level AA)

- [ ] **Navigation methods**: Multiple ways to locate content
  - Site search
  - Site map
  - Navigation menus
  - Breadcrumbs

#### 2.4.6 Headings and Labels (Level AA)

- [ ] **Descriptive headings**: Headings describe content
- [ ] **Descriptive labels**: Form labels describe purpose

  ```html
  <!-- Good: Descriptive -->
  `&lt;h2&gt;`CPU Performance Over Time`&lt;/h2&gt;`
  <label for="start-date">Report Start Date</label>

  <!-- Bad: Generic -->
  `&lt;h2&gt;`Chart`&lt;/h2&gt;`
  <label for="date">Date</label>
  ```

#### 2.4.7 Focus Visible (Level AA)

- [ ] **Focus indicators**: Clear visual focus indicators

  ```css
  .terminal-btn:focus,
  .terminal-form__input:focus {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  /* Custom focus ring */
  .terminal-card:focus-within {
    box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.3);
  }
  ```

### 3.1 Readable

#### 3.1.2 Language of Parts (Level AA)

- [ ] **Multilingual content**: Language changes identified
  ```html
  <p>The French word <span lang="fr">bonjour</span> means hello.</p>
  ```

### 3.2 Predictable

#### 3.2.3 Consistent Navigation (Level AA)

- [ ] **Navigation consistency**: Navigation appears in same location
- [ ] **Consistent ordering**: Navigation items in same order

#### 3.2.4 Consistent Identification (Level AA)

- [ ] **Consistent icons/labels**: Same functionality has same identification
  ```html
  <!-- Consistent across pages -->
  <button class="terminal-btn terminal-btn--primary">
    <span aria-hidden="true">💾</span>
    Save
  </button>
  ```

### 3.3 Input Assistance

#### 3.3.3 Error Suggestion (Level AA)

- [ ] **Error correction**: Suggestions provided for input errors
  ```html
  <input type="email" aria-describedby="email-error" aria-invalid="true" />
  <div id="email-error" role="alert">
    Please enter a valid email address. Example: user@example.com
  </div>
  ```

#### 3.3.4 Error Prevention (Level AA)

- [ ] **Important submissions**: Confirmation, review, or reversal available
  ```html
  <form>
    <!-- Critical action requires confirmation -->
    <button
      type="submit"
      onclick="return confirm('Are you sure you want to delete this agent?')"
    >
      Delete Agent
    </button>
  </form>
  ```

## Testing Procedures

### Automated Testing

#### Run axe-core Tests

````javascript
// Install: npm install @axe-core/cli -g
// Run: axe https://your-site.com

// Or integrate into tests
```javascript
import { axe, toHaveNoViolations } from 'jest-axe';
````text

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => { const results =
await axe(document.body); expect(results).toHaveNoViolations(); });

````

#### Lighthouse Accessibility Audit
```bash
# Command line
lighthouse https://your-site.com --only-categories=accessibility

# Or use DevTools > Audits tab
````

### Manual Testing

#### Keyboard Navigation Test

1. **Tab through all interactive elements**

   - [ ] All interactive elements focusable
   - [ ] Logical tab order
   - [ ] No keyboard traps
   - [ ] Skip links work

2. **Test specific key interactions**
   - [ ] Enter/Space activate buttons
   - [ ] Escape closes modals
   - [ ] Arrow keys navigate menus
   - [ ] Home/End keys work in inputs

#### Screen Reader Testing

**NVDA (Windows)**

```text
1. Download NVDA (free)
2. Start NVDA
3. Navigate to your site
4. Use these commands:
   - Insert + Down Arrow: Read all
   - Insert + F7: List elements
   - Tab: Navigate by tab order
   - H: Navigate by headings
   - L: Navigate by links
   - B: Navigate by buttons
```

**VoiceOver (macOS)**

```text
1. System Preferences > Accessibility > VoiceOver > Enable
2. Use these commands:
   - VO + Right Arrow: Next item
   - VO + U: Open rotor (navigate by type)
   - VO + Space: Activate item
   - VO + H: Next heading
   - Tab: Next focusable element
```

#### Color and Contrast Testing

**Tools:**

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Colour Contrast Analyser](https://www.tpgi.com/color-contrast-checker/)
- Browser extensions (axe, WAVE)

**Manual checks:**

- [ ] High contrast mode (Windows/macOS)
- [ ] Desaturate page (check without color)
- [ ] Different lighting conditions

### Mobile Accessibility

#### Touch Target Size

- [ ] **Minimum size**: 44x44px touch targets
- [ ] **Spacing**: Adequate space between targets
  ```css
  .terminal-btn {
    min-height: 44px;
    min-width: 44px;
    margin: 4px; /* Spacing between buttons */
  }
  ```

#### Orientation Support

- [ ] **Portrait/landscape**: Works in both orientations
- [ ] **No forced orientation**: Content doesn't force orientation
  ```css
  /* Avoid forcing orientation */
  @media (orientation: landscape) {
    /* Responsive adjustments, don't force */
  }
  ```

## Quick Testing Checklist

### 5-Minute Accessibility Check

- [ ] Tab through the page (keyboard navigation)
- [ ] Check color contrast of text
- [ ] Verify all images have alt text
- [ ] Test with screen reader (basic check)
- [ ] Run automated axe scan

### 15-Minute Accessibility Check

- [ ] Complete 5-minute check
- [ ] Test all form interactions
- [ ] Verify focus indicators are visible
- [ ] Check heading hierarchy
- [ ] Test error states and validation
- [ ] Zoom to 200% and verify usability

### 30-Minute Accessibility Check

- [ ] Complete 15-minute check
- [ ] Full screen reader testing
- [ ] Test high contrast mode
- [ ] Verify ARIA labels and descriptions
- [ ] Test mobile accessibility
- [ ] Review and test all interactive components

## Common Issues and Solutions

### Issue: Low Color Contrast

**Solution:**

```css
/* Increase contrast */
:root {
  --text-color: #f0f6fc; /* Higher contrast */
  --muted-text: #c9d1d9; /* Still readable */
}
```

### Issue: Missing Focus Indicators

**Solution:**

```css
/* Always show focus */
*:focus {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* Custom focus styles */
.terminal-btn:focus {
  box-shadow: 0 0 0 3px rgba(88, 166, 255, 0.3);
}
```

### Issue: Inaccessible Forms

**Solution:**

```html
<!-- Add proper labels and error handling -->
<div class="terminal-form__group">
  <label for="agent-id">Agent ID *</label>
  <input
    type="text"
    id="agent-id"
    required
    aria-describedby="agent-id-help agent-id-error"
    aria-invalid="false"
  />
  <div id="agent-id-help">Enter your unique agent identifier</div>
  <div id="agent-id-error" role="alert"></div>
</div>
```

### Issue: Poor Screen Reader Experience

**Solution:**

```html
<!-- Add semantic structure and ARIA -->
<main role="main" aria-labelledby="main-heading">
  `&lt;h1 id="main-heading"&gt;`Dashboard`&lt;/h1&gt;`

  <section aria-labelledby="metrics-heading">
    `&lt;h2 id="metrics-heading"&gt;`Performance Metrics`&lt;/h2&gt;`
    <!-- Content -->
  </section>
</main>

<!-- Live regions for dynamic content -->
<div aria-live="polite" id="status-updates" class="sr-only"></div>
```

## Resources and Tools

### Testing Tools

- **axe DevTools** - Browser extension
- **WAVE** - Web accessibility evaluation
- **Lighthouse** - Built into Chrome DevTools
- **Pa11y** - Command line testing tool
- **jest-axe** - Testing framework integration

### Screen readers

- **NVDA** - Free Windows screen reader
- **JAWS** - Professional Windows screen reader
- **VoiceOver** - Built into macOS/iOS
- **TalkBack** - Built into Android
- **Orca** - Linux screen reader

### Color Tools

- **WebAIM Contrast Checker**
- **Colour Contrast Analyser**
- **Stark** - Design tool plugin
- **Color Oracle** - Color blindness simulator

---

**Remember:** Accessibility is not a checklist—it's an ongoing commitment to
inclusive design. Test with real users when possible and always prioritize user
experience over compliance.

_Built with ╭─🔥─╮ for universal accessibility_
