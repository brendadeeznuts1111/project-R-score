/**
 * Portal shared data contracts (JSDoc / IDE hints for data.js consumers).
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

export {};
