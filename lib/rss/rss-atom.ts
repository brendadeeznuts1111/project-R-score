// @see https://www.rfc-editor.org/rfc/rfc4287 — Atom link relation semantics

import {
  absoluteHttpUrl,
  parseXmlElements,
  parseXmlText,
  requiredText,
  type XmlRecord,
} from './rss-xml-validation.ts';

const ATOM_NAMESPACE = 'http://www.w3.org/2005/Atom';

function namespaceAt(root: XmlRecord, channel: XmlRecord): unknown {
  return Object.hasOwn(channel, '@xmlns:atom') ? channel['@xmlns:atom'] : root['@xmlns:atom'];
}

export function parseAtomSelfUrl(root: XmlRecord, channel: XmlRecord): string | undefined {
  const links = parseXmlElements(channel['atom:link'], 'RSS channel atom:link');
  if (links.length === 0) return undefined;
  if (namespaceAt(root, channel) !== ATOM_NAMESPACE) {
    throw new Error('atom:* elements require the Atom namespace');
  }
  const selfLinks = links.filter(link => parseXmlText(link['@rel']) === 'self');
  if (selfLinks.length > 1) throw new Error('RSS channel atom:self link must not repeat');
  for (const [index, link] of links.entries()) {
    absoluteHttpUrl(
      requiredText(link, '@href', `RSS channel atom:link ${index + 1}`),
      `RSS channel atom:link ${index + 1}@href`
    );
  }
  const self = selfLinks[0];
  if (!self) return undefined;
  const type = parseXmlText(self['@type']);
  if (type && type !== 'application/rss+xml') {
    throw new Error('RSS channel atom:self link type must be application/rss+xml');
  }
  return absoluteHttpUrl(parseXmlText(self['@href']), 'RSS channel atom:self@href');
}
