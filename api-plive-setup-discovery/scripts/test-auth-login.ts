// scripts/test-auth-login.ts - Test login flow
import { fetch } from 'bun';

async function testLogin() {
  console.log('🔐 Testing login flow...');

  try {
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser',
        password: 'testpassword123'
      })
    });

    const data = await response.json();
    const cookies = response.headers.get('set-cookie');

    console.log('✅ Login response:', {
      status: response.status,
      userId: data.userId,
      csrf: data.csrf,
      cookies: cookies ? cookies.split(';').length + ' cookies set' : 'no cookies'
    });

    if (cookies && cookies.includes('gsession')) {
      console.log('✅ gsession cookie set successfully');
    } else {
      console.log('❌ gsession cookie not set');
    }

  } catch (error) {
    console.error('❌ Login test failed:', error.message);
  }
}

if (import.meta.main) {
  testLogin();
}
