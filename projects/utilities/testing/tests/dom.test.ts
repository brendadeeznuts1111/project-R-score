/// <reference lib="dom" />
import { test, expect } from "bun:test";

test("DOM registry verification", () => {
    document.body.innerHTML = `<div id="app">Hello Bun</div>`;
    const app = document.getElementById("app");
    expect(app?.textContent).toBe("Hello Bun");
});
