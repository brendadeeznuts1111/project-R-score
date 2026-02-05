// cookie-scanner.ts - Efficient CLI tool
const args = process.argv.slice(2)

// Get positional argument with fallback
const getPos = (i, fallback = '') => args[i] ?? fallback

const projectId = getPos(0, process.env.PROJECT_ID || 'default')
const sessionId = getPos(1, crypto.randomUUID())

// Compress cookies for R2 storage
const cookies = { projectId, sessionId }
const compressed = Bun.zstdCompressSync(JSON.stringify(cookies))
const prefixed = Buffer.concat([Buffer.from([0x01]), compressed])

// Display with wrapping
const wrap = Bun.wrapAnsi
const msg = `🆔 ${projectId} 📊 ${sessionId} 📦 ${prefixed.length}B R2: ${process.env.R2_BUCKET}` 
console.log(wrap(msg, 80))

// Summary
console.log({
  projectId,
  sessionId,
  bundle: `${prefixed.length}B`,
  bucket: process.env.R2_BUCKET,
  status: '✅ READY'
})
