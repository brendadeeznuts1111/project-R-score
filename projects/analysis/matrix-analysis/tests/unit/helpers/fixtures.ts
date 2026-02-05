import type { Profile } from "../../lib/profileLoader";

export function makeProfile(overrides?: Partial<Profile>): Profile {
  return {
    name: "test-profile",
    version: "1.0.0",
    created: "2025-01-01T00:00:00.000Z",
    env: {
      NODE_ENV: "development",
      APP_NAME: "test-app",
      PORT: "3000",
    },
    ...overrides,
  };
}

export function makeSensitiveProfile(name = "secrets"): Profile {
  return makeProfile({
    name,
    env: {
      NODE_ENV: "production",
      API_KEY: "sk-test-key-12345",
      DB_PASSWORD: "hunter2",
      JWT_SECRET: "super-secret-jwt",
      APP_NAME: "secure-app",
      PORT: "8080",
    },
  });
}
