# Bun MCP Server - Example Usage Scenarios

This document shows real-world examples of how to use the Bun MCP server in Windsurf.

## 🎯 Scenario 1: Learning HTTP Servers

**User:** "How do I create a simple HTTP server in Bun?"

**What happens:**
- Cascade recognizes this is a Bun-specific question
- Calls SearchBun with query: "HTTP server"
- Gets documentation about Bun.serve()
- Provides answer with code examples and links

**Expected Response:**
```typescript
// Cascade will respond with something like:
import { serve } from "bun";

serve({
  port: 3000,
  fetch(req) {
    return new Response("Hello from Bun!");
  },
});

// With explanation and link to docs
```

## 🎯 Scenario 2: Database Integration

**User:** "I need to connect to SQLite in my Bun project"

**What happens:**
- Cascade searches: "SQLite database"
- Finds Bun's built-in SQLite support
- Returns setup instructions and API reference

**Expected Response:**
- Information about bun:sqlite
- Connection examples
- Query examples
- Link to full database documentation

## 🎯 Scenario 3: Testing Your Code

**User:** "How do I write tests for my Bun application?"

**What happens:**
- Cascade searches: "test runner testing"
- Finds test framework documentation
- Returns examples of bun test usage

**Expected Response:**
- Test file structure
- Assertion API
- Running tests commands
- Mocking and fixtures examples

## 🎯 Scenario 4: Performance Optimization

**User:** "What's the fastest way to read a large file in Bun?"

**What happens:**
- Cascade searches: "file reading performance"
- Compares Bun.file(), streams, and traditional methods
- Provides performance tips

**Expected Response:**
- Bun.file() API
- Streaming options
- Performance comparisons
- Best practices for large files

## 🎯 Scenario 5: Migration from Node.js

**User:** "I'm migrating from Express to Bun. What's the equivalent of Express middleware?"

**What happens:**
- Cascade searches: "middleware HTTP routing"
- Finds Bun's server patterns
- Explains how to handle middleware patterns

**Expected Response:**
- Bun.serve() middleware patterns
- Request/Response handling
- Router alternatives (Hono, Elysia)
- Migration guide references

## 🎯 Scenario 6: Package Management

**User:** "How do I add dependencies to my Bun project?"

**What happens:**
- Cascade searches: "package manager dependencies install"
- Finds package management documentation
- Returns installation commands and features

**Expected Response:**
- bun add command syntax
- Workspaces configuration
- Lock file behavior
- Speed comparisons

## 💡 Pro Tips for Better Results

### ✅ Good Questions
**Specific API questions:**
- "How do I use Bun.spawn?"
- "What arguments does Bun.serve accept?"
- "Show me the Bun.file() API"

**Implementation questions:**
- "How do I handle WebSocket connections?"
- "How do I read environment variables?"
- "How do I set up hot reloading?"

**Comparison questions:**
- "What's different between Bun.write and fs.writeFile?"
- "Should I use Bun.password or bcrypt?"

**Troubleshooting questions:**
- "Why is my Bun server not restarting?"
- "How do I fix module resolution errors?"
- "What causes EADDRINUSE errors?"

### ❌ Questions That Won't Work Well
**Too vague:**
- "Tell me about Bun"
- "Is Bun good?"
- "Explain everything"

**Opinion-based:**
- "Should I use Bun or Node?"
- "Is Bun production-ready?"
- "What's better, X or Y?"

**Not in documentation:**
- "Show me your source code"
- "Who created Bun?" (use web search)
- "When was Bun released?" (use web search)

**Real-time status:**
- "Is Bun.sh down?"
- "What's the latest version?" (might be outdated)

## 🔧 Advanced Usage

### Custom Search Strategies
You can guide Cascade to search more effectively:

**Multi-step research:**
```
"First, search for how Bun handles WebSockets. 
Then search for production deployment best practices. 
Finally, combine both to show me how to deploy a WebSocket server."
```

**Specific documentation sections:**
```
"Search the API reference for Bun.serve options"
"Find examples in the guides section about file uploads"
```

### Combining with Other Tools
The SearchBun tool works great with other Windsurf capabilities:

**Code generation + documentation:**
```
"Create a REST API using Bun.serve. Use SearchBun to find 
the best practices for routing and error handling."
```

**Debugging + research:**
```
"I'm getting this error: [error message]. Search the Bun docs 
for similar issues and suggest fixes."
```

## 🎨 Example Conversation Flow

**You:** I want to build a web API with Bun

**Cascade:** I'll help you build a web API with Bun! Let me search the documentation for the best approach.

[Cascade uses SearchBun: "web API REST server"]

**Cascade:** Bun provides a fast built-in server via Bun.serve(). Here's a complete example:

[Code example with routing, JSON handling, etc.]

You can read more about:
- HTTP server basics: [link]
- Routing patterns: [link]
- Request/Response API: [link]

Would you like me to add features like authentication or database integration?

**You:** Yes, add SQLite database

**Cascade:** [Cascade uses SearchBun: "SQLite database integration"]

[Provides database setup and integration code]

## 📊 Search Quality Tips

### For Best Results:
- **Be specific about what you want**
  - ✅ "WebSocket server example"
  - ❌ "networking"

- **Include the API or feature name**
  - ✅ "Bun.serve configuration"
  - ❌ "server settings"

- **Mention the use case**
  - ✅ "file upload handling"
  - ❌ "files"

- **Use technical terms**
  - ✅ "SSE event stream"
  - ❌ "server push"

### Understanding Results:
The tool returns:
- **Title**: Documentation page title
- **Content**: Relevant excerpt (not full page)
- **URL**: Direct link to full documentation
- **Section**: Which part of docs (if available)

Always check the full documentation link for complete information!

## 🚀 Real Project Examples

### Example 1: Building a File Upload Service
```typescript
// 1. Ask: "How do I handle file uploads in Bun?"
// 2. Cascade searches and provides:

import { serve } from "bun";

serve({
  async fetch(req) {
    if (req.method === "POST") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      await Bun.write(`uploads/${file.name}`, file);
      
      return new Response("File uploaded!");
    }
    return new Response("Send POST with file");
  },
  port: 3000,
});

// 3. Follow up: "How do I validate file types?"
// 4. Get file validation examples
```

### Example 2: Real-time Chat App
```typescript
// 1. Ask: "How do I create a WebSocket chat server?"
// 2. Get WebSocket documentation
// 3. Ask: "How do I broadcast messages to all clients?"
// 4. Get broadcasting patterns
// 5. Implement complete chat server with guidance
```

### Example 3: Background Job Processor
```typescript
// 1. Ask: "How do I run background tasks in Bun?"
// 2. Learn about Bun.spawn and subprocess
// 3. Ask: "How do I schedule recurring tasks?"
// 4. Get timer and interval examples
// 5. Build job queue system
```

## 🎓 Learning Path

### Beginner
- "How do I create a basic HTTP server?"
- "How do I read and write files?"
- "How do I parse JSON?"
- "How do I handle errors?"

### Intermediate
- "How do I use middleware patterns?"
- "How do I connect to databases?"
- "How do I handle authentication?"
- "How do I test my code?"

### Advanced
- "How do I optimize performance?"
- "How do I use workers and threading?"
- "How do I implement streaming?"
- "How do I deploy to production?"

---

Happy coding with Bun! 🚀
