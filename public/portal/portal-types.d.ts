/**
 * Portal shared data contracts (JSDoc / IDE hints for data.js / ops dashboard).
 *
 * Channel meta shapes mirror `lib/verification/types.ts` (ChannelAwareVerificationReport).
 */

/** @typedef {'loading'|'ok'|'stale'|'error'} PortalDataStatus */

/**
 * @typedef {Object} PortalHealthPayload
 * @property {number} [schemaVersion]
 * @property {'ok'|'degraded'|'fail'} [status]
 * @property {Record<string, unknown>} [env]
 * @property {boolean} [_stale]
 * @property {number} [_timestamp]
 */

/**
 * @typedef {Object} PortalDataEventDetail
 * @property {PortalDataStatus} status
 * @property {PortalHealthPayload|null} [data]
 * @property {unknown} [error]
 */

/** @typedef {'runtime'|'package-manager'|'networking'|'bundler'|'test'|'other'} PortalVerificationSubsystem */

/** @typedef {'docs'|'blog'|'reference'|'other'} PortalCanonicalSourceKind */

/**
 * @typedef {Object} PortalVerificationSemanticTags
 * @property {string} channel
 * @property {string} targetVersion
 * @property {string} [latestAtTestTime]
 * @property {string} provenanceId
 * @property {string} testedAt
 * @property {string} runtimeVersion
 * @property {string} [bunRevision]
 * @property {string} [channelResolveSource]
 * @property {string} [githubAuthSource]
 * @property {PortalVerificationSubsystem[]} [subsystems]
 */

/**
 * @typedef {Object} PortalVerificationResult
 * @property {string} name
 * @property {string} expected
 * @property {string} actual
 * @property {boolean} passed
 * @property {PortalVerificationSubsystem} [subsystem]
 * @property {string} [introducedIn]
 * @property {PortalCanonicalSourceKind} [canonicalSource]
 * @property {string} [canonical]
 * @property {string} [canonicalKey]
 * @property {string[]} [features]
 */

/**
 * @typedef {Object} PortalChannelAwareVerificationReport
 * @property {'ChannelAwareVerificationReport'} type
 * @property {'1.0.0'} version
 * @property {string} timestamp
 * @property {string} bunVersion
 * @property {string} bunRevision
 * @property {PortalVerificationSemanticTags} semanticTags
 * @property {PortalVerificationResult[]} results
 * @property {{passed:number,total:number,status:'pass'|'fail',bySubsystem?:Record<string,{passed:number,total:number}>}} summary
 * @property {string} proofHash
 */

/**
 * @typedef {Object} PortalVerificationSnapshotIndex
 * @property {'VerificationSnapshotIndex'} type
 * @property {'1.0.0'} version
 * @property {string} updatedAt
 * @property {string} canonical
 * @property {Array<{id:string,channel:string,targetVersion:string,suite?:string,path:string,proofHash?:string,status?:string}>} snapshots
 */

/**
 * @typedef {Object} PortalChannelMetaBake
 * @property {'ChannelMetaBake'} type
 * @property {'1.0.0'} version
 * @property {string} updatedAt
 * @property {string} proofHash
 * @property {number} passed
 * @property {number} total
 * @property {'pass'|'fail'} status
 * @property {{release:string,nits:string,bundler:string,networking:string}} sources
 * @property {'/registry/release-features.json'} path
 */

/**
 * @typedef {Object} PortalOpsChannelMetaSlice
 * @property {boolean} available
 * @property {boolean} [ok]
 * @property {number} [passed]
 * @property {number} [total]
 * @property {'pass'|'fail'} [status]
 * @property {string} [proofHash]
 * @property {{release:string,nits:string,bundler:string,networking:string}} [sources]
 * @property {'/registry/release-features.json'} path
 * @property {'/registry/channel-meta-bake.json'} bakePath
 */

export {};
