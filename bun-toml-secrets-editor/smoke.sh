#!/bin/bash

# Find project root directory
PROJECT_ROOT=""
if [[ -f "./package.json" && -f "./bun.toml" ]]; then
    PROJECT_ROOT="."
elif [[ -f "../package.json" && -f "../bun.toml" ]]; then
    PROJECT_ROOT=".."
elif [[ -f "../../package.json" && -f "../../bun.toml" ]]; then
    PROJECT_ROOT="../.."
else
    echo "❌ Cannot find project root (looking for package.json and bun.toml)"
    exit 1
fi

bun -e "
import { ProfileRssBridge } from '$PROJECT_ROOT/src/integration/profile-rss-bridge.ts';
import { getLogger, resetLogger } from '$PROJECT_ROOT/src/logging/enhanced-logger.ts';
import { RSSFeedMonitor } from '$PROJECT_ROOT/src/dashboard/collectors/rss-feed-monitor.ts';
import { existsSync } from 'fs';

const r = { pass: 0, fail: [] };

const t = (n, fn) => {
  try { 
    fn(); 
    r.pass++; 
    console.log('✓', n); 
  } catch(e) { 
    r.fail.push(n); 
    console.log('✗', n); 
  }
};

t('SSRF', () => { 
  const b = new ProfileRssBridge(); 
  if (!b['isInternalURL']('http://192.168.1.1/')) throw new Error(); 
});

t('Logger', () => { 
  resetLogger(); 
  const l = getLogger(); 
  if (typeof l.info !== 'function') throw new Error(); 
});

t('RSS', () => { 
  const m = new RSSFeedMonitor({maxFeeds:1,maxItemsPerFeed:1,defaultInterval:60,userAgent:'t'}); 
  const i = m.addFeed('https://example.com/x',{title:'T'}); 
  if (!i) throw new Error(); 
  m.removeFeed(i); 
});

t('TOML', () => { 
  const c = Bun.TOML.parse('[p]\na=1'); 
  if (c.p.a !== 1) throw new Error(); 
});

t('FS', () => { 
  if (!existsSync('$PROJECT_ROOT/package.json')) throw new Error(); 
});

t('Perf', () => { 
  const s = performance.now(); 
  new Array(1e5).fill(0).map((_,i)=>i).sort((a,b)=>b-a); 
  if (performance.now()-s > 500) throw new Error(); 
});

console.log(r.pass + '/6 passed'); 
if (r.fail.length) { 
  console.log('FAIL:', r.fail.join(',')); 
  process.exit(1); 
} else { 
  console.log('✅ READY'); 
}
"
