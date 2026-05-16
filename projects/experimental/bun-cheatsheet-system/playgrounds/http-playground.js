#!/usr/bin/env bun
import readline from 'readline';

class HTTPPlayground {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '🌐> '
    });
    
    this.history = [];
    this.baseUrl = 'https://httpbin.org';
  }

  async initialize() {
    console.clear();
    this.showBanner();
    
    console.log('🌐 HTTP Playground Ready!');
    console.log('💡 Type "help" to see available commands\n');
    
    this.rl.prompt();
    
    this.rl.on('line', async (line) => {
      await this.handleCommand(line.trim());
      this.rl.prompt();
    });
    
    this.rl.on('close', () => {
      console.log('\n👋 Goodbye! Happy HTTP hacking!');
      process.exit(0);
    });
  }

  showBanner() {
    const banner = `
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🌐 HTTP PLAYGROUND                                         ║
║   ================                                           ║
║                                                               ║
║   Interactive HTTP Client Testing & Learning                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `;
    console.log(banner);
  }

  async handleCommand(input) {
    if (!input) return;
    
    this.history.push(input);
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);
    
    switch (command) {
      case 'help':
        this.showHelp();
        break;
        
      case 'get':
        await this.handleGet(args[0]);
        break;
        
      case 'post':
        await this.handlePost(args[0], args.slice(1).join(' '));
        break;
        
      case 'put':
        await this.handlePut(args[0], args.slice(1).join(' '));
        break;
        
      case 'delete':
        await this.handleDelete(args[0]);
        break;
        
      case 'headers':
        await this.handleHeaders(args[0]);
        break;
        
      case 'status':
        await this.handleStatus(args[0]);
        break;
        
      case 'json':
        await this.handleJSON(args[0], args.slice(1).join(' '));
        break;
        
      case 'form':
        await this.handleForm(args[0]);
        break;
        
      case 'upload':
        await this.handleUpload(args[0]);
        break;
        
      case 'timeout':
        await this.handleTimeout(args[0]);
        break;
        
      case 'retry':
        await this.handleRetry(args[0], parseInt(args[1]) || 3);
        break;
        
      case 'base':
        this.setBaseUrl(args[0]);
        break;
        
      case 'history':
        this.showHistory();
        break;
        
      case 'clear':
        console.clear();
        this.showBanner();
        break;
        
      case 'exit':
      case 'quit':
        this.rl.close();
        break;
        
      default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('💡 Type "help" for available commands');
        break;
    }
  }

  showHelp() {
    console.log('\n🌐 HTTP Playground Commands:');
    console.log('='.repeat(50));
    
    const commands = [
      { cmd: 'help', desc: 'Show this help message' },
      { cmd: 'get <endpoint>', desc: 'Send GET request' },
      { cmd: 'post <endpoint> <data>', desc: 'Send POST request with data' },
      { cmd: 'put <endpoint> <data>', desc: 'Send PUT request with data' },
      { cmd: 'delete <endpoint>', desc: 'Send DELETE request' },
      { cmd: 'headers <endpoint>', desc: 'Show response headers' },
      { cmd: 'status <code>', desc: 'Test specific status code' },
      { cmd: 'json <endpoint> <data>', desc: 'Send JSON data' },
      { cmd: 'form <endpoint>', desc: 'Send form data' },
      { cmd: 'upload <endpoint>', desc: 'Upload file' },
      { cmd: 'timeout <ms>', desc: 'Test request timeout' },
      { cmd: 'retry <endpoint> <times>', desc: 'Retry failed requests' },
      { cmd: 'base <url>', desc: 'Set base URL' },
      { cmd: 'history', desc: 'Show command history' },
      { cmd: 'clear', desc: 'Clear screen' },
      { cmd: 'exit', desc: 'Exit playground' }
    ];
    
    commands.forEach(item => {
      console.log(`  ${item.cmd.padEnd(25)} ${item.desc}`);
    });
    
    console.log('\n🎯 Examples:');
    console.log('  get /get                    - GET request to /get');
    console.log('  post /post {"name":"test"} - POST JSON data');
    console.log('  status 404                  - Test 404 response');
    console.log('  base https://api.example.com - Change base URL');
  }

  async handleGet(endpoint) {
    if (!endpoint) {
      console.log('Usage: get <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📥 GET ${url}`);
    
    try {
      const startTime = Date.now();
      const response = await fetch(url);
      const endTime = Date.now();
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log(`⏱️  Time: ${endTime - startTime}ms`);
      console.log(`📋 Content-Type: ${response.headers.get('content-type')}`);
      
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('📊 Response (JSON):');
        console.log(JSON.stringify(data, null, 2));
      } else {
        const text = await response.text();
        console.log('📄 Response (Text):');
        console.log(text.substring(0, 500) + (text.length > 500 ? '...' : ''));
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handlePost(endpoint, data) {
    if (!endpoint) {
      console.log('Usage: post <endpoint> <data>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📤 POST ${url}`);
    
    try {
      let body = data || '{}';
      let headers = { 'Content-Type': 'application/json' };
      
      // Try to parse as JSON, fallback to text
      try {
        JSON.parse(body);
      } catch {
        headers = { 'Content-Type': 'text/plain' };
      }
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body
      });
      const endTime = Date.now();
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      console.log(`⏱️  Time: ${endTime - startTime}ms`);
      
      const responseData = await response.json();
      console.log('📊 Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handlePut(endpoint, data) {
    if (!endpoint) {
      console.log('Usage: put <endpoint> <data>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📤 PUT ${url}`);
    
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: data || '{}'
      });
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.log('📊 Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleDelete(endpoint) {
    if (!endpoint) {
      console.log('Usage: delete <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`🗑️  DELETE ${url}`);
    
    try {
      const response = await fetch(url, { method: 'DELETE' });
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      
      const responseData = await response.json();
      console.log('📊 Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleHeaders(endpoint) {
    if (!endpoint) {
      console.log('Usage: headers <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📋 Headers for ${url}`);
    
    try {
      const response = await fetch(url);
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      
      console.log('📋 Response Headers:');
      response.headers.forEach((value, key) => {
        console.log(`   ${key}: ${value}`);
      });
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleStatus(statusCode) {
    if (!statusCode) {
      console.log('Usage: status <code>');
      return;
    }
    
    const url = `${this.baseUrl}/status/${statusCode}`;
    console.log(`🔍 Testing status code ${statusCode}`);
    
    try {
      const response = await fetch(url);
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log('✅ Request successful');
      } else {
        console.log('⚠️  Request failed as expected');
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleJSON(endpoint, data) {
    if (!endpoint) {
      console.log('Usage: json <endpoint> <json-data>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    const jsonData = data || '{"test": true}';
    
    console.log(`📊 JSON POST ${url}`);
    console.log(`📝 Data: ${jsonData}`);
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonData
      });
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.log('📊 Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleForm(endpoint) {
    if (!endpoint) {
      console.log('Usage: form <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📝 Form POST ${url}`);
    
    try {
      const formData = new FormData();
      formData.append('name', 'HTTP Playground');
      formData.append('message', 'Testing form data');
      formData.append('timestamp', Date.now().toString());
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.log('📊 Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleUpload(endpoint) {
    if (!endpoint) {
      console.log('Usage: upload <endpoint>');
      return;
    }
    
    const url = `${this.baseUrl}${endpoint}`;
    console.log(`📁 File Upload ${url}`);
    
    try {
      const fileContent = 'Hello from HTTP Playground!\nThis is a test file.';
      const blob = new Blob([fileContent], { type: 'text/plain' });
      
      const formData = new FormData();
      formData.append('file', blob, 'test.txt');
      formData.append('description', 'Test upload from playground');
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      console.log(`✅ Status: ${response.status} ${response.statusText}`);
      const responseData = await response.json();
      console.log('📊 Response:');
      console.log(JSON.stringify(responseData, null, 2));
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }

  async handleTimeout(ms) {
    if (!ms) {
      console.log('Usage: timeout <milliseconds>');
      return;
    }
    
    const url = `${this.baseUrl}/delay/5`; // 5 second delay
    console.log(`⏱️  Testing timeout (${ms}ms) against 5s delay`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), parseInt(ms));
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log('✅ Request completed within timeout');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('⏱️  Request timed out as expected');
      } else {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  async handleRetry(endpoint, times) {
    if (!endpoint) {
      console.log('Usage: retry <endpoint> <times>');
      return;
    }
    
    const url = `${this.baseUrl}/status/500`; // Will always fail
    console.log(`🔄 Retry ${endpoint} ${times} times`);
    
    for (let attempt = 1; attempt <= times; attempt++) {
      try {
        console.log(`📡 Attempt ${attempt}/${times}...`);
        const response = await fetch(url);
        
        if (response.ok) {
          console.log('✅ Request successful!');
          return;
        }
        
        console.log(`❌ Attempt ${attempt} failed: ${response.status}`);
      } catch (error) {
        console.log(`❌ Attempt ${attempt} error: ${error.message}`);
      }
      
      if (attempt < times) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`🔄 All ${times} attempts failed`);
  }

  setBaseUrl(url) {
    if (!url) {
      console.log('Usage: base <url>');
      return;
    }
    
    this.baseUrl = url;
    console.log(`🔧 Base URL set to: ${this.baseUrl}`);
  }

  showHistory() {
    console.log('\n📜 Command History:');
    this.history.forEach((cmd, i) => {
      console.log(`${i + 1}. ${cmd}`);
    });
  }
}

// Start the HTTP playground
if (import.meta.main) {
  const playground = new HTTPPlayground();
  await playground.initialize();
}

export { HTTPPlayground };
