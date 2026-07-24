/**
 * JSON-LD structured data for verification reports.
 *
 * @see https://schema.org/SoftwareApplication
 * @see https://schema.org/AggregateRating
 */
import type { SemanticTags, VerificationResult } from './types.ts';

export function generateJSONLD(results: VerificationResult[], tags: SemanticTags): object {
  const passed = results.filter(r => r.passed).length;
  const total = results.length || 1;
  const rating = total > 0 ? (passed / total) * 5 : 0;

  const channelBits = [
    `Channel: ${tags.channel}`,
    `Target: ${tags.targetVersion}`,
    `Runtime: ${tags.runtimeVersion}`,
  ];
  if (tags.canaryCommitShort) channelBits.push(`Canary: ${tags.canaryCommitShort}`);
  if (tags.targetMatchesRuntime != null) {
    channelBits.push(`Match: ${tags.targetMatchesRuntime ? 'yes' : 'no'}`);
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FactoryWager Bun Release Verification',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    softwareVersion: tags.runtimeVersion,
    dateModified: tags.testedAt,
    url: tags.channelReleaseUrl,
    identifier: tags.canaryCommit ?? tags.targetVersion,
    featureList: [...new Set(results.flatMap(r => r.features ?? []))],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: Number(rating.toFixed(2)),
      reviewCount: total,
      bestRating: 5,
      worstRating: 0,
    },
    review: results.map(r => ({
      '@type': 'Review',
      name: r.name,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: r.passed ? 5 : 1,
        bestRating: 5,
        worstRating: 1,
      },
      datePublished: tags.testedAt,
      author: {
        '@type': 'Organization',
        name: 'FactoryWager Operations',
      },
      reviewBody: channelBits.join(', '),
    })),
  };
}
