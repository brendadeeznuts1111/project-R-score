import type { FeedImageSource } from './feed-image.ts';
import {
  absoluteHttpUrl,
  parseXmlElements,
  parseXmlInteger,
  parseXmlText,
  requiredText,
  type XmlRecord,
} from './rss-xml-validation.ts';

const MEDIA_NAMESPACE = 'http://search.yahoo.com/mrss/';
const MEDIA_KINDS = new Set(['image', 'audio', 'video', 'document', 'executable']);
const EXPRESSIONS = new Set(['sample', 'full', 'nonstop']);

function mediaNamespaceBound(scopes: readonly XmlRecord[]): boolean {
  for (let index = scopes.length - 1; index >= 0; index--) {
    const scope = scopes[index];
    if (scope && Object.hasOwn(scope, '@xmlns:media')) {
      return scope['@xmlns:media'] === MEDIA_NAMESPACE;
    }
  }
  return false;
}

function mediaElements(owner: XmlRecord, field: string, scopes: readonly XmlRecord[]): XmlRecord[] {
  const values = parseXmlElements(owner[field], field);
  for (const value of values) {
    if (!mediaNamespaceBound([...scopes, owner, value])) {
      throw new Error('media:* elements require the Media RSS 1.5.1 namespace');
    }
  }
  return values;
}

function optionalInteger(record: XmlRecord, attribute: string, field: string, min: number): void {
  if (record[attribute] !== undefined) parseXmlInteger(record[attribute], field, { min });
}

function validatePlayer(record: XmlRecord, field: string): string {
  const url = absoluteHttpUrl(requiredText(record, '@url', field), `${field}@url`);
  optionalInteger(record, '@width', `${field}@width`, 1);
  optionalInteger(record, '@height', `${field}@height`, 1);
  return url;
}

function validateThumbnail(record: XmlRecord, field: string): string {
  optionalInteger(record, '@width', `${field}@width`, 1);
  optionalInteger(record, '@height', `${field}@height`, 1);
  return absoluteHttpUrl(requiredText(record, '@url', field), `${field}@url`);
}

type MediaContent = { record: XmlRecord; url?: string };

function validateContent(record: XmlRecord, scopes: XmlRecord[], field: string): MediaContent {
  const players = mediaElements(record, 'media:player', scopes);
  if (players.length > 1) throw new Error(`${field} <media:player> must not repeat`);
  const playerUrl = players[0] ? validatePlayer(players[0], `${field} media:player`) : '';
  const rawUrl = parseXmlText(record['@url']);
  if (!rawUrl && !playerUrl) throw new Error(`${field} requires @url or <media:player>`);
  for (const [attribute, min] of [
    ['@fileSize', 0],
    ['@duration', 0],
    ['@height', 1],
    ['@width', 1],
  ] as const)
    optionalInteger(record, attribute, `${field}${attribute}`, min);
  const type = parseXmlText(record['@type']);
  if (type && !/^[^\s/]+\/[^\s/]+$/.test(type))
    throw new Error(`${field}@type must be a MIME type`);
  const medium = parseXmlText(record['@medium']);
  if (medium && !MEDIA_KINDS.has(medium)) throw new Error(`${field}@medium is invalid`);
  const expression = parseXmlText(record['@expression']);
  if (expression && !EXPRESSIONS.has(expression)) throw new Error(`${field}@expression is invalid`);
  const isDefault = parseXmlText(record['@isDefault']);
  if (isDefault && isDefault !== 'true' && isDefault !== 'false') {
    throw new Error(`${field}@isDefault must be true or false`);
  }
  mediaElements(record, 'media:thumbnail', scopes).forEach((thumbnail, index) =>
    validateThumbnail(thumbnail, `${field} media:thumbnail ${index + 1}`)
  );
  for (const [index, credit] of mediaElements(record, 'media:credit', scopes).entries()) {
    if (!parseXmlText(credit)) throw new Error(`${field} media:credit ${index + 1} requires text`);
  }
  return { record, ...(rawUrl ? { url: absoluteHttpUrl(rawUrl, `${field}@url`) } : {}) };
}

export function itemImageCandidate(
  item: XmlRecord,
  ancestors: XmlRecord[],
  context: string
): { url: string; source: FeedImageSource } | undefined {
  const itemScopes = [...ancestors, item];
  const direct = mediaElements(item, 'media:content', ancestors).map((record, index) =>
    validateContent(record, itemScopes, `${context} media:content ${index + 1}`)
  );
  const grouped = mediaElements(item, 'media:group', ancestors).flatMap((group, groupIndex) => {
    const scopes = [...itemScopes, group];
    const contents = mediaElements(group, 'media:content', itemScopes).map((record, index) =>
      validateContent(
        record,
        scopes,
        `${context} media:group ${groupIndex + 1} content ${index + 1}`
      )
    );
    if (contents.filter(({ record }) => parseXmlText(record['@isDefault']) === 'true').length > 1) {
      throw new Error(`${context} media:group ${groupIndex + 1} has multiple default contents`);
    }
    return contents;
  });
  const enclosures = parseXmlElements(item.enclosure, `${context} enclosure`);
  if (enclosures.length > 1) throw new Error(`${context} <enclosure> must not repeat`);
  for (const enclosure of enclosures) {
    absoluteHttpUrl(
      requiredText(enclosure, '@url', `${context} enclosure`),
      `${context} enclosure@url`
    );
    requiredText(enclosure, '@type', `${context} enclosure`);
    parseXmlInteger(
      requiredText(enclosure, '@length', `${context} enclosure`),
      `${context} enclosure@length`,
      { min: 0 }
    );
  }
  const thumbnails = mediaElements(item, 'media:thumbnail', ancestors);
  const thumbnailUrls = thumbnails.map((thumbnail, index) =>
    validateThumbnail(thumbnail, `${context} media:thumbnail ${index + 1}`)
  );
  const players = mediaElements(item, 'media:player', ancestors);
  if (players.length > 1) throw new Error(`${context} <media:player> must not repeat`);
  players.forEach((player, index) =>
    validatePlayer(player, `${context} media:player ${index + 1}`)
  );
  const credits = mediaElements(item, 'media:credit', ancestors);
  for (const [index, credit] of credits.entries()) {
    if (!parseXmlText(credit))
      throw new Error(`${context} media:credit ${index + 1} requires text`);
  }
  const media = [...direct, ...grouped];
  if (media.length + thumbnails.length + players.length + enclosures.length > 32) {
    throw new Error(`${context} exceeds 32 media references`);
  }
  for (const { record, url } of media) {
    const type = parseXmlText(record['@type']).toLowerCase();
    const medium = parseXmlText(record['@medium']).toLowerCase();
    if (url && (type.startsWith('image/') || medium === 'image' || (!type && !medium))) {
      return { url, source: 'media:content' };
    }
  }
  const enclosure = enclosures[0];
  if (enclosure && parseXmlText(enclosure['@type']).toLowerCase().startsWith('image/')) {
    return {
      url: absoluteHttpUrl(parseXmlText(enclosure['@url']), `${context} enclosure@url`),
      source: 'enclosure',
    };
  }
  if (thumbnailUrls[0]) return { url: thumbnailUrls[0], source: 'media:thumbnail' };
  return undefined;
}
