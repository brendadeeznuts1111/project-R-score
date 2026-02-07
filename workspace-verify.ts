// Temporary workspace import verification — delete after testing
import { ABTestingManager } from '@fw/ab-testing';
import { ABTestManager } from '@fw/ab-testing';
import { classifyHabits, refs, ReferenceManager } from '@fw/business';
import { checkBunFirstCompliance } from '@fw/guards';
import { BusinessContinuity, CustomerNotifier } from '@fw/p2p';
import { PackageManager } from '@fw/package';
import { createRipgrepEngine, scanDirectory, ConfigManager } from '@fw/rip';
import { VersionTracker } from '@fw/versioning';

console.log('All workspace imports resolved successfully!');
console.log({
  'ab-testing': [typeof ABTestingManager, typeof ABTestManager],
  'business': [typeof classifyHabits, typeof refs, typeof ReferenceManager],
  'guards': [typeof checkBunFirstCompliance],
  'p2p': [typeof BusinessContinuity, typeof CustomerNotifier],
  'package': [typeof PackageManager],
  'rip': [typeof createRipgrepEngine, typeof scanDirectory, typeof ConfigManager],
  'versioning': [typeof VersionTracker],
});
