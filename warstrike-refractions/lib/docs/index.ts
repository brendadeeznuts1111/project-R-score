// lib/docs/index.ts - Main exports
export { BUN_DOCS } from './urls'
export { DOC_PATTERNS } from './patterns'

// Quick access functions
export const getTypedArrayRef = () => BUN_DOCS.typedArray.base
export const getFileRef = (type: keyof typeof BUN_DOCS.file) => BUN_DOCS.file[type]
export const getBothDomains = (url: string) => ({
  sh: url,
  com: BUN_DOCS.toCom(url)
})
