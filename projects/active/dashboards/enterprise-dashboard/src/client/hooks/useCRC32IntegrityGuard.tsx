import { useState, useEffect, useCallback, useMemo } from 'react';
import assetsConfig from '../../../config/assets.toml' with { type: 'toml' };

export type AssetKey = keyof typeof assetsConfig.assets;

export interface AssetInfo {
  path: string;
  crc32: number;
}

export interface UseCRC32Result {
  isValid: boolean | null;
  isLoading: boolean;
  error: string | null;
  computedCRC32: number | null;
  expectedCRC32: number | null;
  reload: () => void;
}

export function useCRC32IntegrityGuard(
  assetKey: AssetKey,
  options: { skipCache?: boolean; cacheTTL?: number } = {}
): UseCRC32Result {
  const { skipCache = false, cacheTTL = 5000 } = options;

  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [computedCRC32, setComputedCRC32] = useState<number | null>(null);
  const [lastCheck, setLastCheck] = useState<number>(0);

  const asset = useMemo(() => {
    const assets = assetsConfig.assets as Record<string, AssetInfo>;
    const key = String(assetKey);
    return assets[key];
  }, [assetKey]);

  const expectedCRC32 = useMemo(() => asset?.crc32 ?? null, [asset]);

  const verify = useCallback(async () => {
    if (!asset) {
      setError(`Asset "${String(assetKey)}" not found in config`);
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    if (!skipCache && now - lastCheck < cacheTTL && computedCRC32 !== null) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const file = Bun.file(asset.path);
      if (!await file.exists()) {
        setError(`Asset file not found: ${asset.path}`);
        setIsValid(false);
        setIsLoading(false);
        return;
      }

      const buffer = await file.arrayBuffer();
      const computed = Bun.hash.crc32(buffer);
      const valid = computed === asset.crc32;

      setComputedCRC32(computed);
      setIsValid(valid);
      setLastCheck(now);

      if (!valid) {
        console.warn(
          `CRC32 mismatch for ${String(assetKey)}: expected 0x${asset.crc32.toString(16)}, got 0x${computed.toString(16)}`
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsValid(false);
    } finally {
      setIsLoading(false);
    }
  }, [asset, assetKey, skipCache, cacheTTL, lastCheck, computedCRC32]);

  useEffect(() => {
    verify();
  }, [verify]);

  return {
    isValid,
    isLoading,
    error,
    computedCRC32,
    expectedCRC32,
    reload: verify,
  };
}

export function useBatchCRC32Guard(
  assetKeys: AssetKey[],
  options: { skipCache?: boolean; cacheTTL?: number } = {}
): UseCRC32Result[] {
  return assetKeys.map((key) => useCRC32IntegrityGuard(key, options));
}

export function useAssetIntegrityGuard() {
  const [overallStatus, setOverallStatus] = useState<{
    checked: number;
    valid: number;
    invalid: number;
    loading: boolean;
  }>({
    checked: 0,
    valid: 0,
    invalid: 0,
    loading: true,
  });

  const allAssets = useMemo(() => {
    return Object.entries(assetsConfig.assets) as [AssetKey, AssetInfo][];
  }, []);

  const results = useMemo(() => {
    return allAssets.map(([key]) => useCRC32IntegrityGuard(key));
  }, [allAssets]);

  useEffect(() => {
    const checked = results.filter((r) => r.isValid !== null).length;
    const valid = results.filter((r) => r.isValid === true).length;
    const invalid = results.filter((r) => r.isValid === false).length;
    const loading = results.some((r) => r.isLoading);

    setOverallStatus({ checked, valid, invalid, loading });
  }, [results]);

  const reloadAll = useCallback(() => {
    results.forEach((r) => r.reload());
  }, [results]);

  return {
    results,
    overallStatus,
    reloadAll,
    allValid: overallStatus.invalid === 0 && overallStatus.checked > 0,
  };
}
