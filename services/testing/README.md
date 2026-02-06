# Testing Services

Experimental and testing frameworks for A/B testing and feature flags.

## 🧪 Services

### **A/B Testing Service** (`ab-testing-service.ts`)
Comprehensive A/B testing framework for URL structures and feature experimentation:
- User segmentation and cohort management
- Variant assignment with weighted distribution
- Real-time experiment tracking
- Performance metrics collection
- Statistical significance testing
- Feature flag management

## 🎯 Features

### **Experiment Management**
- Create and manage A/B tests
- Define control and treatment variants
- Set traffic allocation percentages
- Schedule experiment start/end times

### **User Tracking**
- Anonymous user identification
- Cohort assignment persistence
- Cross-session tracking
- User journey analytics

### **Analytics & Reporting**
- Real-time conversion tracking
- Statistical significance calculations
- Confidence intervals
- Performance impact analysis

### **Feature Flags**
- Dynamic feature toggling
- Environment-specific flags
- User-based targeting
- Rollback capabilities

## 🚀 Usage

```typescript
import ABTestingService from './ab-testing-service';

// Initialize A/B testing
const abTest = new ABTestingService({
  testId: 'url-structure-comparison',
  variants: {
    control: { name: 'Fragment URLs', weight: 0.5 },
    treatment: { name: 'Direct URLs', weight: 0.5 }
  }
});

// Get user's variant
const userId = 'user123';
const variant = await abTest.getVariant(userId);

// Track conversion
await abTest.trackConversion(userId, 'page_view', {
  url: '/example',
  loadTime: 250
});

// Get experiment results
const results = await abTest.getResults();
console.log('Statistical significance:', results.significance);
```

## 📊 Experiment Types

### **URL Structure Testing**
- Fragment URLs vs Direct URLs
- URL parameter variations
- Path structure experiments

### **Feature Testing**
- UI component variations
- Algorithm performance
- User experience changes

### **Performance Testing**
- Loading time optimizations
- Caching strategies
- Resource loading patterns

## 🔧 Configuration

Environment variables:
- `AB_TEST_ENABLED` - Enable/disable A/B testing (default: false)
- `AB_TEST_PERSISTENCE` - Storage backend for user assignments
- `AB_TEST_SIGNIFICANCE_LEVEL` - Statistical significance threshold (default: 0.95)

## 📈 Analytics

The service tracks:
- Conversion rates per variant
- Statistical significance
- Confidence intervals
- Sample size requirements
- Performance metrics

## 🔗 Dependencies

- Bun runtime for HTTP server
- Statistical calculation libraries
- User identification system
- Analytics storage backend
