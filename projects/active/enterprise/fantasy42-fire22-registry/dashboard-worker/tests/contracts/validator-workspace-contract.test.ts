import { describe, expect, test } from "bun:test";

/**
 * Temporary debt contract for the missing @fire22/validator workspace.
 *
 * Decision: neither restore nor prune is safe from the available source history.
 * Owners: @fire22/engineering and @fire22/backend for API consumers;
 * @fire22/security and @fire22/devops for the security-registry peer contract.
 *
 * Remove this contract only when a reviewed change either restores the real
 * package and schemas or removes every manifest and source consumer below.
 */

const PROJECT_ROOT = Bun.fileURLToPath(new URL("../../", import.meta.url));
const VALIDATOR_PACKAGE = "@fire22/validator";

const DEPENDENCY_SECTIONS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

const EXPECTED_MANIFEST_REFERENCES = [
  "packages/enhanced-logging/package.json#dependencies",
  "workspaces/@fire22-api-consolidated/package.json#peerDependencies",
  "workspaces/@fire22-security-registry/package.json#peerDependencies",
];

const EXPECTED_SOURCE_IMPORTS = [
  "scripts/consolidate-endpoints.ts",
  "src/api/controllers/admin.controller.ts",
  "src/api/controllers/manager.controller.ts",
  "src/api/routes/admin.routes.ts",
  "src/api/routes/auth.routes.ts",
  "src/api/routes/financial.routes.ts",
  "src/api/routes/health.routes.ts",
  "src/api/routes/manager.routes.ts",
  "src/api/routes/other.routes.ts",
  "workspaces/@fire22-api-consolidated/src/controllers/admin.controller.ts",
  "workspaces/@fire22-api-consolidated/src/controllers/manager.controller.ts",
  "workspaces/@fire22-api-consolidated/src/routes/admin.routes.ts",
  "workspaces/@fire22-api-consolidated/src/routes/auth.routes.ts",
  "workspaces/@fire22-api-consolidated/src/routes/customer.routes.ts",
  "workspaces/@fire22-api-consolidated/src/routes/financial.routes.ts",
  "workspaces/@fire22-api-consolidated/src/routes/health.routes.ts",
  "workspaces/@fire22-api-consolidated/src/routes/manager.routes.ts",
  "workspaces/@fire22-api-consolidated/src/routes/other.routes.ts",
  "workspaces/@fire22-api-consolidated/src/schemas/index.d.ts",
  "workspaces/@fire22-api-consolidated/src/schemas/index.ts",
];

interface PackageManifest {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

async function collectManifestState() {
  const references: string[] = [];
  const providers: string[] = [];
  const glob = new Bun.Glob("{packages,workspaces}/**/package.json");

  for await (const relativePath of glob.scan({ cwd: PROJECT_ROOT })) {
    const manifest: PackageManifest = await Bun.file(
      `${PROJECT_ROOT}/${relativePath}`,
    ).json();

    if (manifest.name === VALIDATOR_PACKAGE) providers.push(relativePath);

    for (const section of DEPENDENCY_SECTIONS) {
      if (manifest[section]?.[VALIDATOR_PACKAGE] === "workspace:*") {
        references.push(`${relativePath}#${section}`);
      }
    }
  }

  return { providers: providers.sort(), references: references.sort() };
}

async function collectSourceImports() {
  const imports: string[] = [];
  const glob = new Bun.Glob(
    "{scripts,src,packages,workspaces}/**/*.{ts,tsx,js,mjs,cjs}",
  );
  const validatorImport =
    /(?:from\s+|import\s*\(\s*)["']@fire22\/validator(?:\/[^"']*)?["']/;

  for await (const relativePath of glob.scan({ cwd: PROJECT_ROOT })) {
    const source = await Bun.file(`${PROJECT_ROOT}/${relativePath}`).text();
    if (validatorImport.test(source)) imports.push(relativePath);
  }

  return imports.sort();
}

describe("@fire22/validator workspace debt contract", () => {
  test("pins the unresolved provider and its exact manifest consumers", async () => {
    const state = await collectManifestState();

    expect(state.providers).toEqual([]);
    expect(state.references).toEqual(EXPECTED_MANIFEST_REFERENCES);
  });

  test("pins every source surface coupled to the missing package", async () => {
    expect(await collectSourceImports()).toEqual(EXPECTED_SOURCE_IMPORTS);
  });
});
