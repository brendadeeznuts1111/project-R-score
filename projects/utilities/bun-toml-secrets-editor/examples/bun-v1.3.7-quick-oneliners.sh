#!/bin/bash
# Bun v1.3.7 Quick Performance One-Liners
# Copy-paste these commands to test performance improvements

echo "🚀 Bun v1.3.7 Performance One-Liners"
echo "===================================="

echo ""
echo "⚡ Buffer/Array Speed Demons"
echo "----------------------------"

echo "🔥 50% faster Buffer.from(array) → ARM64 bliss:"
echo 'bunx -e "console.time();for(let i=0;i<1e6;i++)Buffer.from([i%256,(i+1)%256,(i+2)%256,(i+3)%256]);console.timeEnd()"'

echo ""
echo "🚀 3x faster array.flat() + Array.from(arguments):"
echo 'bunx -e "console.time();for(let i=0;i<1e4;i++)Array(100).fill(0).map(j=>[j,[j+1,[j+2,j+3]]]).flat(3);console.timeEnd()"'

echo 'bunx -e "console.time();for(let i=0;i<1e5;i++)Array.from(arguments,[1,2,[3,4,[5]]].flat(3));console.timeEnd()(1,2,3)"'

echo ""
echo "📏 String + Async Rockets"
echo "-------------------------"

echo "⚡ 90% faster padStart/padEnd:"
echo 'bunx -e "console.time();for(let i=0;i<1e6;i++)'\''2026'\''.padStart(20,'\''0'\'');console.timeEnd()"'

echo 'bunx -e "console.time();for(let i=0;i<1e6;i++)`item-${i}`.padEnd(30,'\''-'\'');console.timeEnd()"'

echo "🔄 35% faster async/await (streaming JSONL):"
echo 'bunx -e "async function* gen(){for(let i=0;i<1000;i++)yield JSON.stringify({i})};(async()=>{let c=0;console.time();for await(const line of Bun.JSONL.parse(gen()))c++;console.timeEnd();console.log(\`Processed \${c} records\`)})()"'

echo ""
echo "🔍 Profilers + Telemetry"
echo "------------------------"

echo "📊 Markdown CPU profiles (--cpu-prof-md):"
echo "bun --cpu-prof-md --cpu-prof-interval 1000 run server.ts"

echo "💾 Heap profiling + node:inspector:"
echo "bun --heap-prof-md --inspect-brk=9229 server.ts"

echo "🔍 Live inspector profiler API:"
echo 'bunx -e "const inspector=require('\''node:inspector'\'');inspector.Session().connect();console.log('\''Profiler ready chrome://inspect'\'')"'

echo ""
echo "🆕 New APIs One-Shot"
echo "-------------------"

echo "📄 Native JSON5 (comments + trailing commas):"
echo 'bunx -e "console.log(Bun.JSON5.parse('\''{foo:1,//comment\nbar:2,}'\''))"'

echo "📋 Streaming JSONL parsing:"
echo 'echo '\''{"a":1}\n{"b":2}\'' | bunx -e "for await(const obj of Bun.JSONL.parse(Bun.stdin()))console.log(obj)"'

echo "🎨 Bun.wrapAnsi() → CLI magic (33-88x faster):"
echo 'bunx -e "console.log(Bun.wrapAnsi('\''\x1b[32m🚀 Bun v1.3.7\x1b[0m'\'',{width:40}))"'

echo "🔧 REPL-mode transpiler (dev playground):"
echo 'bunx -e "console.log(new Bun.Transpiler({replMode:true}).transform('\''const x=await Bun.sleep(100);x'\''))"'

echo ""
echo "🌐 HTTP/WS + S3"
echo "--------------"

echo "📡 Header case preserved fetch:"
echo 'bunx -e "fetch('\''https://httpbin.org/headers'\'',{headers:{'\''X-Case-Sensitive'\'':'\''Test'\''}}).then(r=>r.json()).then(console.log)"'

echo "🔌 WebSocket URL credentials:"
echo 'bunx -e "console.log('\''Testing WebSocket with credentials: wss://user:pass@example.com/socket'\'')"'

echo "🔄 Buffer byte swapping performance:"
echo 'bunx -e "const buf=Buffer.from([0x48,0x00,0x65,0x00]);console.time();for(let i=0;i<1e6;i++){buf.swap16();buf.swap16()};console.timeEnd()"'

echo 'bunx -e "const buf=Buffer.alloc(8);buf.writeBigUInt64LE(0x0102030405060708n);console.time();for(let i=0;i<5e5;i++){buf.swap64();buf.swap64()};console.timeEnd()"'

echo ""
echo "🏗️ Prod Endpoint Boilerplate"
echo "---------------------------"

echo "🚀 Quick scaffold with new features:"
echo "bun create ."
echo "bun pm pack"

echo "📊 Production profiling setup:"
echo "bun --cpu-prof-md --cpu-prof-dir ./profiles server.ts"

echo ""
echo "🎯 Performance Comparison Commands"
echo "---------------------------------"

echo "Test all improvements at once:"
echo "bun examples/bun-v1.3.7-oneliners.ts"

echo "Run comprehensive benchmarks:"
echo "bun examples/benchmarks/bun-v1.3.7-performance-bench.ts"

echo "Profile the benchmarks:"
echo "bun --cpu-prof-md examples/benchmarks/bun-v1.3.7-performance-bench.ts"

echo ""
echo "💡 Quick Tips:"
echo "------------"
echo "• ARM64 systems see biggest Buffer.from() gains (~50%)"
echo "• Use Bun.wrapAnsi() for CLI tools - 88x faster than npm"
echo "• JSON5 parsing eliminates external dependencies"
echo "• Streaming JSONL perfect for large dataset processing"
echo "• Header case preservation fixes API compatibility issues"
echo "• WebSocket URL credentials enable Puppeteer remote connections"

echo ""
echo "🔥 Which performance win will you test first? ⏱️"
