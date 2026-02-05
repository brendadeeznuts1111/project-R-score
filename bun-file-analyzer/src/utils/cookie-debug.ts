import { Bun } from "bun";

export function debugCookies(cookies: Bun.CookieMap) {
  console.log(
    `%c🍪 Cookie Map (${cookies.size} cookies)`,
    `color: ${Bun.color("hsl(28, 80%, 52%)", "ansi")}; font-weight: bold`
  );

  for (const [name, value] of cookies.entries()) {
    const cookie = new Bun.Cookie(name, value);
    console.log(
      `  %c${name}%c = %c${value}`,
      `color: ${Bun.color("hsl(210, 90%, 55%)", "ansi")}`,
      "color: reset",
      `color: ${Bun.color("hsl(145, 63%, 42%)", "ansi")}`
    );
  }
}

export function visualizeCookieJar(jar: Bun.CookieMap) {
  const canvas = {
    width: 60,
    height: 10,
  };

  const chart = [];
  for (let i = 0; i < canvas.height; i++) {
    chart.push(" ".repeat(canvas.width));
  }

  let x = 2;
  for (const [name, value] of jar.entries()) {
    const colorHash = Bun.hash.crc32(`${name}=${value}`);
    const y = (colorHash % canvas.height);

    const line = chart[y].split("");
    line[x] = "●";
    chart[y] = line.join("");

    x += 3;
    if (x > canvas.width - 5) x = 2;
  }

  console.log(`\n${chart.join("\n")}\n`);
}
