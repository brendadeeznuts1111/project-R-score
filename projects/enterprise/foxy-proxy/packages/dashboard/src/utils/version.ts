// Build-time version information
// These process.env variables are replaced at build time via --define flags

export function getVersion() {
  return {
    version: process.env.BUILD_VERSION || "0.0.0-dev",
    buildTime: process.env.BUILD_TIME || new Date().toISOString(),
    commit: process.env.GIT_COMMIT || "unknown",
  };
}

export function getVersionString() {
  const { version, buildTime, commit } = getVersion();
  return `${version} (${commit.slice(0, 7)}) built at ${buildTime}`;
}

export function logVersion() {
  console.log(`🚀 ${getVersionString()}`);
}