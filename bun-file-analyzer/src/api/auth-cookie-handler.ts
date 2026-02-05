import { Bun } from "bun";

let cookieJar: Bun.CookieMap;

if (import.meta.hot) {
  cookieJar = import.meta.hot.data.cookieJar ?? new Bun.CookieMap(new Request('https://api.example.com'), {});
} else {
  cookieJar = new Bun.CookieMap(new Request('https://api.example.com'), {});
}

export async function loginAndStoreCookies() {
  const response = await fetch("https://api.example.com/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "admin", password: Bun.env.API_PASSWORD }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  for (const header of setCookieHeaders) {
    const cookie = Bun.Cookie.parse(header);
    cookieJar.set(cookie.name, cookie.value, {
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  }

  return { success: true, cookieCount: cookieJar.size };
}

export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  if (cookieJar.size === 0) {
    await loginAndStoreCookies();
  }

  const cookieHeader = Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");

  const headers = new Headers(options.headers);
  if (cookieHeader) {
    headers.set("Cookie", cookieHeader);
  }

  const response = await fetch(url, { ...options, headers, credentials: "include" });

  const newCookies = response.headers.getSetCookie?.() || [];
  for (const header of newCookies) {
    const cookie = Bun.Cookie.parse(header);
    cookieJar.set(cookie.name, cookie.value, {
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires,
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
    });
  }

  return response;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    import.meta.hot.data.cookieJar = cookieJar;
  });
}
