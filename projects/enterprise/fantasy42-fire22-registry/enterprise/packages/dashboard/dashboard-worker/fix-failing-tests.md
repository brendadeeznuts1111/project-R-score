# 🔧 Fix Failing Tests Guide

Based on the test results, here are the specific issues and solutions:

## ❌ **Failed Tests Analysis**

### **1. Authentication Tests (2/2 failed)**

```text
❌ Test login without credentials - HTTP 404: Not Found
❌ Test protected endpoint without token - HTTP 404: Not Found
```

**Issue**: Authentication endpoints don't exist in your worker **Solution**:
These endpoints are missing from your `index-real-data.ts`

**Add these endpoints to your worker:**

```typescript
// Add to your main request handler in index-real-data.ts

// Authentication endpoints
if (url.pathname === '/api/auth/login') {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Check against ADMIN_PASSWORD secret
    if (username === 'admin' && password === env.ADMIN_PASSWORD) {
      // Generate JWT token
      const token = jwt.sign({ username, role: 'admin' }, env.JWT_SECRET, {
        expiresIn: '24h',
      });

      return new Response(
        JSON.stringify({
          success: true,
          token,
          message: 'Login successful',
        }),
        {
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request format',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}

if (url.pathname === '/api/auth/verify') {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No token provided',
        }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, env.JWT_SECRET);

    return new Response(
      JSON.stringify({
        success: true,
        user: decoded,
        message: 'Token valid',
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid token',
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}
```

### **2. Error Handling Test (1/2 failed)**

```text
❌ Test malformed request - Malformed request should be rejected
```

**Issue**: The weekly figures endpoint accepts malformed JSON requests
**Solution**: Add proper request validation

**Update the weekly figures endpoint:**

```typescript
if (url.pathname === '/api/manager/getWeeklyFigureByAgent') {
  try {
    // Check content type
    const contentType = request.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      // Reject JSON requests for this endpoint
      return new Response(
        JSON.stringify({
          success: false,
          error: 'This endpoint expects form data, not JSON',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const agentID = formData.get('agentID');
    const week = formData.get('week');

    if (!agentID) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'agentID parameter required',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    // ... rest of your existing logic
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Invalid request format',
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}
```

### **3. Sync Operations Test (1/2 failed)**

```text
❌ Test Fire22 customer sync - HTTP 400: Bad Request
```

**Issue**: The sync endpoint is rejecting requests **Solution**: Check the sync
endpoint implementation

**Verify your sync endpoint:**

```typescript
if (url.pathname === '/api/sync/fire22-customers') {
  try {
    // Add proper validation
    const response = await fire22API.syncCustomers();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Fire22 customers synced successfully',
        syncedCount: response?.length || 0,
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('Error syncing Fire22 customers:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to sync Fire22 customers',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
}
```

## 🚀 **Quick Fix Commands**

### **1. Add JWT dependency (if not already present)**

```bash
bun add jsonwebtoken
bun add -d @types/jsonwebtoken
```

### **2. Update your worker**

```bash
# Make the changes above to index-real-data.ts
# Then redeploy
bun run deploy
```

### **3. Re-run tests**

```bash
# Quick test first
bun run test:quick

# Full test suite
bun run test:checklist
```

## 📊 **Expected Results After Fixes**

After implementing these fixes, you should see:

- ✅ **Authentication Tests**: 2/2 passed
- ✅ **Error Handling**: 2/2 passed
- ✅ **Sync Operations**: 2/2 passed
- **Overall Success Rate**: 100% 🎉

## 🔍 **Verification Steps**

1. **Check authentication flow**:

   ```bash
   curl -X POST "https://dashboard-worker.brendawill2233.workers.dev/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{"username":"admin","password":"wrongpassword"}'
   # Should return 401
   ```

2. **Test malformed request rejection**:

   ```bash
   curl -X POST "https://dashboard-worker.brendawill2233.workers.dev/api/manager/getWeeklyFigureByAgent" \
     -H "Content-Type: application/json" \
     -d '{"invalid":"data"}'
   # Should return 400
   ```

3. **Verify sync endpoint**:
   ```bash
   curl -X POST "https://dashboard-worker.brendawill2233.workers.dev/api/sync/fire22-customers"
   # Should return success response
   ```

## ⚠️ **Important Notes**

- **JWT_SECRET**: Ensure this secret is properly set in your wrangler secrets
- **ADMIN_PASSWORD**: This should match the password you want to use for admin
  access
- **CORS Headers**: Your existing CORS configuration should work with these new
  endpoints

## 🎯 **Next Steps**

1. Implement the authentication endpoints
2. Add proper request validation
3. Fix the sync endpoint
4. Deploy and re-test
5. Run the full test suite to verify 100% success rate

Once all tests pass, your dashboard worker will be production-ready! 🚀
