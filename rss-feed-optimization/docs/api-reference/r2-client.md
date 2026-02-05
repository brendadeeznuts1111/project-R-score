# R2 Client API Reference

This document provides comprehensive documentation for the R2 storage client used in the RSS Feed Optimization project.

## Overview

The R2 client provides an interface for interacting with Cloudflare R2 storage, which is used for storing and retrieving blog posts, images, and other content.

## Class: R2BlogStorage

### Constructor

```javascript
import R2BlogStorage from './r2-client.js';

const storage = new R2BlogStorage();
```

The constructor automatically configures the R2 client using environment variables:

- `R2_ACCOUNT_ID` - Cloudflare account ID
- `R2_ACCESS_KEY_ID` - R2 access key ID
- `R2_SECRET_ACCESS_KEY` - R2 secret access key
- `R2_BUCKET_NAME` - R2 bucket name

### Methods

#### listPosts(prefix, limit)

Lists posts stored in R2.

**Parameters:**
- `prefix` (string, optional): Prefix to filter objects (default: 'posts/')
- `limit` (number, optional): Maximum number of objects to return (default: 100)

**Returns:** Promise<Array<Object>> - Array of post objects

**Example:**
```javascript
const posts = await storage.listPosts('posts/', 50);
console.log(posts.length); // Number of posts
console.log(posts[0].Key); // First post key
```

**Response Format:**
```javascript
[
  {
    Key: 'posts/my-first-post.json',
    LastModified: '2025-01-27T10:30:00.000Z',
    ETag: '"abc123"',
    Size: 1024,
    StorageClass: 'STANDARD'
  }
]
```

#### getPost(key)

Retrieves a specific post from R2.

**Parameters:**
- `key` (string): The R2 object key

**Returns:** Promise<Object|null> - Post object or null if not found

**Example:**
```javascript
const post = await storage.getPost('posts/my-first-post.json');
if (post) {
  console.log(post.title);
  console.log(post.content);
}
```

**Post Object Format:**
```javascript
{
  id: '1234567890',
  slug: 'my-first-post',
  title: 'My First Blog Post',
  excerpt: 'A brief description of your post',
  content: '# My First Blog Post\n\nThis is the content...',
  author: 'Your Name',
  tags: ['bun', 'rss', 'optimization'],
  publishedAt: '2025-01-27T10:30:00.000Z',
  updatedAt: '2025-01-27T10:30:00.000Z',
  readTime: 5,
  wordCount: 500
}
```

#### uploadPost(post)

Uploads a post to R2 storage.

**Parameters:**
- `post` (Object): The post object to upload

**Returns:** Promise<string> - The R2 object key

**Example:**
```javascript
const post = {
  id: '1234567890',
  slug: 'my-new-post',
  title: 'My New Post',
  excerpt: 'A brief description',
  content: '# My New Post\n\nContent here...',
  author: 'Author Name',
  tags: ['technology'],
  publishedAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  readTime: 3,
  wordCount: 300
};

const key = await storage.uploadPost(post);
console.log(`Uploaded to: ${key}`);
```

#### uploadImage(buffer, filename, contentType)

Uploads an image to R2 storage.

**Parameters:**
- `buffer` (Buffer): The image data
- `filename` (string): Original filename
- `contentType` (string): MIME type of the image

**Returns:** Promise<Object> - Upload result with key and URL

**Example:**
```javascript
import { readFile } from 'fs/promises';

const imageBuffer = await readFile('./image.jpg');
const result = await storage.uploadImage(
  imageBuffer,
  'image.jpg',
  'image/jpeg'
);

console.log(result.key); // R2 object key
console.log(result.url); // Presigned URL
```

**Response Format:**
```javascript
{
  key: 'images/1234567890-image.jpg',
  url: 'https://your-bucket.r2.cloudflarestorage.com/images/1234567890-image.jpg'
}
```

#### generatePresignedUrl(key, expiresIn)

Generates a presigned URL for accessing an R2 object.

**Parameters:**
- `key` (string): The R2 object key
- `expiresIn` (number, optional): URL expiration time in seconds (default: 3600)

**Returns:** Promise<string> - Presigned URL

**Example:**
```javascript
const url = await storage.generatePresignedUrl('posts/my-post.json', 7200);
console.log(url); // URL valid for 2 hours
```

#### deletePost(key)

Deletes a post from R2 storage.

**Parameters:**
- `key` (string): The R2 object key

**Returns:** Promise<boolean> - True if successful, false otherwise

**Example:**
```javascript
const success = await storage.deletePost('posts/old-post.json');
if (success) {
  console.log('Post deleted successfully');
}
```

#### syncLocalPosts(localDir)

Syncs local markdown files to R2 storage.

**Parameters:**
- `localDir` (string, optional): Local directory containing markdown files (default: './content/posts')

**Returns:** Promise<Object> - Sync result

**Example:**
```javascript
const result = await storage.syncLocalPosts('./content/posts');
console.log(`Synced ${result.synced} posts`);
if (result.errors) {
  console.error('Sync errors:', result.errors);
}
```

**Response Format:**
```javascript
{
  success: true,
  synced: 10,
  errors: 0,
  errorDetails: []
}
```

#### processMarkdownToPost(content, filename)

Processes markdown content into a post object.

**Parameters:**
- `content` (string): Markdown content
- `filename` (string): Original filename

**Returns:** Promise<Object> - Processed post object

**Example:**
```javascript
const markdown = `---
title: My Post
slug: my-post
author: Author
date: 2025-01-27
tags: technology
excerpt: A brief description
---

# My Post

Content here...`;

const post = await storage.processMarkdownToPost(markdown, 'my-post.md');
console.log(post.title); // 'My Post'
```

## Error Handling

The R2 client includes comprehensive error handling:

### Common Errors

```javascript
try {
  const post = await storage.getPost('nonexistent.json');
} catch (error) {
  if (error.name === 'NoSuchKey') {
    console.log('Post not found');
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### Error Types

- `NoSuchKey` - Object not found in R2
- `AccessDenied` - Insufficient permissions
- `InvalidBucketName` - Invalid bucket name
- `NetworkError` - Network connectivity issues

## Configuration

### Environment Variables

```bash
# Required
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY_ID="your-access-key"
R2_SECRET_ACCESS_KEY="your-secret-key"
R2_BUCKET_NAME="your-bucket-name"

# Optional
R2_ENDPOINT="https://your-account-id.r2.cloudflarestorage.com"
R2_REGION="auto"
```

### Configuration Validation

The client validates configuration on initialization:

```javascript
const storage = new R2BlogStorage();

// Will throw error if required variables are missing
// Will log warnings for missing optional variables
```

## Usage Examples

### Complete Workflow

```javascript
import R2BlogStorage from './r2-client.js';

async function managePosts() {
  const storage = new R2BlogStorage();
  
  // 1. List existing posts
  const posts = await storage.listPosts();
  console.log(`Found ${posts.length} posts`);
  
  // 2. Upload a new post
  const newPost = {
    id: Date.now().toString(),
    slug: 'new-post',
    title: 'New Blog Post',
    excerpt: 'A new blog post',
    content: '# New Post\n\nContent here...',
    author: 'Author',
    tags: ['blog'],
    publishedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    readTime: 2,
    wordCount: 200
  };
  
  const key = await storage.uploadPost(newPost);
  console.log(`Uploaded post: ${key}`);
  
  // 3. Retrieve the post
  const retrievedPost = await storage.getPost(key);
  console.log('Retrieved:', retrievedPost.title);
  
  // 4. Generate presigned URL
  const url = await storage.generatePresignedUrl(key);
  console.log('Presigned URL:', url);
  
  // 5. Delete the post
  await storage.deletePost(key);
  console.log('Post deleted');
}

managePosts().catch(console.error);
```

### Bulk Operations

```javascript
async function bulkOperations() {
  const storage = new R2BlogStorage();
  
  // Sync local content
  const syncResult = await storage.syncLocalPosts('./content/posts');
  console.log(`Synced ${syncResult.synced} posts`);
  
  // List all posts
  const allPosts = await storage.listPosts();
  
  // Process posts in parallel
  const postPromises = allPosts.map(async (post) => {
    const content = await storage.getPost(post.Key);
    return {
      ...content,
      url: await storage.generatePresignedUrl(post.Key)
    };
  });
  
  const processedPosts = await Promise.all(postPromises);
  console.log(`Processed ${processedPosts.length} posts`);
}
```

## Performance Considerations

### Caching

The R2 client doesn't include built-in caching. For performance:

```javascript
// Implement your own caching
const cache = new Map();

async function getCachedPost(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  
  const post = await storage.getPost(key);
  cache.set(key, post);
  return post;
}
```

### Batch Operations

For better performance with multiple operations:

```javascript
// Process multiple posts concurrently
const keys = ['post1.json', 'post2.json', 'post3.json'];
const posts = await Promise.all(
  keys.map(key => storage.getPost(key))
);
```

### Error Recovery

Implement retry logic for transient errors:

```javascript
async function uploadWithRetry(post, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await storage.uploadPost(post);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## Monitoring and Logging

### Built-in Logging

The R2 client includes logging for important operations:

```javascript
// Logs successful operations
// Logs errors with context
// Logs performance metrics
```

### Custom Monitoring

Add your own monitoring:

```javascript
class MonitoredR2Storage extends R2BlogStorage {
  async uploadPost(post) {
    const start = Date.now();
    try {
      const result = await super.uploadPost(post);
      const duration = Date.now() - start;
      console.log(`Upload took ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`Upload failed after ${duration}ms:`, error);
      throw error;
    }
  }
}
```

## Security Best Practices

### Credentials Management

```bash
# Store credentials securely
# Use environment variables
# Rotate credentials regularly
# Limit bucket permissions
```

### Access Control

```javascript
// Use minimal permissions
// Implement bucket policies
// Use presigned URLs for temporary access
// Validate file types and sizes
```

### Data Validation

```javascript
// Validate post content
// Sanitize user input
// Check file sizes
// Validate file types
```

## Troubleshooting

### Common Issues

#### 1. Authentication Errors

**Problem**: "Access Denied" or authentication failures.

**Solution**:
```bash
# Verify credentials
echo $R2_ACCESS_KEY_ID
echo $R2_SECRET_ACCESS_KEY

# Check bucket permissions
# Verify account ID
```

#### 2. Network Issues

**Problem**: Timeouts or connection failures.

**Solution**:
```bash
# Check network connectivity
# Verify R2 endpoint
# Implement retry logic
```

#### 3. File Not Found

**Problem**: NoSuchKey errors.

**Solution**:
```javascript
// Check if file exists before accessing
const posts = await storage.listPosts();
const exists = posts.some(p => p.Key === 'your-file.json');
```

### Debug Mode

Enable debug logging:

```bash
DEBUG=true bun run your-script.js
```

### Performance Issues

**Problem**: Slow operations.

**Solution**:
```javascript
// Use parallel operations
// Implement caching
// Monitor network latency
// Check file sizes
```

## Integration with Other Services

### Database Integration

```javascript
// Store R2 URLs in database
const dbPost = {
  title: post.title,
  contentUrl: await storage.generatePresignedUrl(key),
  imageUrl: await storage.generatePresignedUrl(imageKey),
  metadata: post
};
```

### CDN Integration

```javascript
// Use CDN URLs instead of R2 URLs
function getCdnUrl(r2Url) {
  return r2Url.replace('r2.cloudflarestorage.com', 'cdn.yourdomain.com');
}
```

### Backup Integration

```javascript
// Backup R2 data
async function backupR2() {
  const posts = await storage.listPosts();
  for (const post of posts) {
    const content = await storage.getPost(post.Key);
    // Save to backup storage
  }
}
```

This comprehensive API reference should help you effectively use the R2 client in your RSS Feed Optimization project.