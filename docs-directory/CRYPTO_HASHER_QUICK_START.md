# Bun.CryptoHasher - Quick Start Guide

### 🚀 **Get Started with Cryptographic Hashing**

The Bun.CryptoHasher demo is now fully integrated and ready to use!

## 🎯 **How to Access**

### **Method 1: Navigation Button**
1. Open the documentation platform
2. Look for the **"CryptoHasher"** button in the main navigation (green color)
3. Click to launch the interactive demo

### **Method 2: Direct URL**
Navigate to: `http://localhost:3006/#crypto-hasher`

## 🔐 **What You Can Do**

### **1. Basic Hashing**
- **Select Algorithm**: Choose from 18+ algorithms (SHA-256, SHA-512, MD5, etc.)
- **Enter Text**: Type or paste text to hash
- **Choose Encoding**: Select output format (hex, base64, base64url, binary)
- **Generate Hash**: Click "Generate Hash" for instant results

### **2. HMAC (Message Authentication)**
- **Enable HMAC**: Toggle the "Use HMAC" switch
- **Enter Secret Key**: Provide a secret key for message authentication
- **Generate HMAC**: Create authenticated hashes for secure communication

### **3. Real-time Features**
- **Live Results**: See hash results instantly
- **Copy to Clipboard**: One-click copy functionality
- **History Tracking**: View your recent hashing operations
- **Code Examples**: Get ready-to-use code snippets

## 📋 **Supported Algorithms**

### **SHA Family**
- `sha256`, `sha512`, `sha384`, `sha224`, `sha1`
- `sha512-224`, `sha512-256`

### **SHA3 Family**
- `sha3-256`, `sha3-512`, `sha3-384`, `sha3-224`

### **BLAKE2**
- `blake2b256`, `blake2b512`

### **Other Algorithms**
- `md5`, `ripemd160`, `shake128`, `shake256`

## 🔑 **HMAC Support**

### **HMAC-Compatible Algorithms**
- `blake2b512`, `md5`, `sha1`, `sha224`, `sha256`
- `sha384`, `sha512-224`, `sha512-256`, `sha512`

### **HMAC Use Cases**
- **API Authentication**: Secure API request signing
- **Message Verification**: Ensure message integrity
- **Token Generation**: Create secure authentication tokens
- **Data Integrity**: Verify data hasn't been tampered with

## 💻 **Code Examples**

### **Basic Hashing**
```typescript
// From the demo - ready to use!
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("hello world");
const result = hasher.digest("hex");
```

### **HMAC with Secret Key**
```typescript
// From the demo - official Bun syntax!
const hasher = new Bun.CryptoHasher("sha256", "secret-key");
hasher.update("hello world");
console.log(hasher.digest("hex")); 
// => "095d5a21fe6d0646db223fdf3de6436bb8dfb2fab0b51677ecf6441fcf5f2a67"
```

### **Multiple Updates**
```typescript
const hasher = new Bun.CryptoHasher("sha256");
hasher.update("part1");
hasher.update("part2");
hasher.update("part3");
const finalHash = hasher.digest();
```

### **State Copying**
```typescript
const hasher = new Bun.CryptoHasher("sha256", "secret-key");
hasher.update("hello world");

const copy = hasher.copy();
copy.update("!");
console.log(copy.digest("hex")); // Different result
```

## 🎯 **Educational Features**

### **Algorithm Information**
- **Security Level**: Learn which algorithms are best for security
- **Performance**: Understand speed vs. security tradeoffs
- **Use Cases**: See when to use each algorithm
- **Output Size**: Know the bit length of each hash

### **Encoding Formats**
- **Hex**: Most common, readable format
- **Base64**: Compact, URL-safe option
- **Base64URL**: Perfect for web applications
- **Binary**: Raw bytes for low-level applications

### **Real-time Learning**
- **Live Code Generation**: See code as you configure settings
- **Performance Metrics**: Understand algorithm performance
- **Best Practices**: Learn cryptographic security principles

## 🔧 **Advanced Features**

### **History Tracking**
- **Recent Operations**: View your last 10 hashing operations
- **Timestamps**: See when each operation was performed
- **Settings Recall**: Remember your algorithm and encoding choices

### **Copy Functionality**
- **One-Click Copy**: Instantly copy hash results
- **Visual Feedback**: See confirmation when copied
- **Multiple Formats**: Copy in different encodings

### **Responsive Design**
- **Mobile Friendly**: Works on all devices
- **Dark/Light Theme**: Matches your preference
- **Touch Optimized**: Easy interaction on tablets

## 🚀 **Production Use Cases**

### **Security Applications**
```typescript
// Password hashing (use Bun.password for actual passwords)
const hasher = new Bun.CryptoHasher("sha256");
hasher.update(password + salt);
const hash = hasher.digest("hex");
```

### **Data Integrity**
```typescript
// File verification
const fileData = await Bun.file("document.pdf").arrayBuffer();
const hasher = new Bun.CryptoHasher("sha512");
hasher.update(fileData);
const checksum = hasher.digest("hex");
```

### **API Security**
```typescript
// Request signing
const signer = new Bun.CryptoHasher("sha256", apiSecret);
signer.update(method + path + timestamp + body);
const signature = signer.digest("hex");
```

## 🌟 **Why Bun.CryptoHasher?**

### **Performance Benefits**
- **Native Implementation**: Built into Bun runtime
- **Zero Dependencies**: No external libraries needed
- **High Speed**: Optimized for performance
- **Memory Efficient**: Minimal memory footprint

### **Developer Experience**
- **Simple API**: Easy to use and understand
- **TypeScript Support**: Full type safety
- **Multiple Outputs**: Flexible encoding options
- **Cross-Platform**: Works everywhere Bun runs

## 🎊 **Ready to Explore!**

**The Bun.CryptoHasher demo is your complete guide to cryptographic hashing!**

### **🚀 Start Now**
1. Navigate to `#crypto-hasher` in the platform
2. Try different algorithms and encodings
3. Experiment with HMAC for secure applications
4. Copy the generated code for your projects

### **🎓 Learn Cryptography**
- Understand different hash algorithms
- Learn when to use HMAC vs. regular hashing
- Explore encoding options and their use cases
- Master cryptographic best practices

### **💼 Build Secure Applications**
- Implement secure API authentication
- Add data integrity verification
- Create secure token systems
- Build privacy-preserving applications

**🔐 Start exploring Bun's powerful cryptographic capabilities today!**
