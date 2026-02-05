// lib/documentation/constants/utils.ts
export enum UtilsCategory {
  FILE_SYSTEM = 'file_system',
  NETWORKING = 'networking',
  PROCESS = 'process',
  STRING = 'string',
  ARRAY = 'array',
  OBJECT = 'object',
  VALIDATION = 'validation',
  CONVERSION = 'conversion',
  CRYPTOGRAPHY = 'cryptography',
  DATE = 'date'
}

export const BUN_UTILS_URLS = {
  // bun.sh/utils documentation
  [UtilsCategory.FILE_SYSTEM]: {
    MAIN: '/docs/api/utils#file-system',
    READ_FILE: '/docs/api/utils#readfile',
    WRITE_FILE: '/docs/api/utils#writefile',
    READ_DIR: '/docs/api/utils#readdir',
    STAT: '/docs/api/utils#stat',
    COPY_FILE: '/docs/api/utils#copyfile',
    MOVE_FILE: '/docs/api/utils#movefile',
    DELETE_FILE: '/docs/api/utils#deletefile',
    FILE_EXISTS: '/docs/api/utils#fileexists'
  },
  
  [UtilsCategory.NETWORKING]: {
    MAIN: '/docs/api/utils#networking',
    FETCH: '/docs/api/utils#fetch-utility',
    SERVE: '/docs/api/utils#serve',
    WEBSOCKET: '/docs/api/utils#websocket',
    TCP: '/docs/api/utils#tcp',
    UDP: '/docs/api/utils#udp',
    DNS: '/docs/api/utils#dns'
  },
  
  [UtilsCategory.PROCESS]: {
    MAIN: '/docs/api/utils#process',
    SPAWN: '/docs/api/utils#spawn',
    EXEC: '/docs/api/utils#exec',
    FORK: '/docs/api/utils#fork',
    KILL: '/docs/api/utils#kill',
    PID: '/docs/api/utils#pid',
    SIGNALS: '/docs/api/utils#signals'
  },
  
  [UtilsCategory.VALIDATION]: {
    MAIN: '/docs/api/utils#validation',
    IS_STRING: '/docs/api/utils#isstring',
    IS_NUMBER: '/docs/api/utils#isnumber',
    IS_BOOLEAN: '/docs/api/utils#isboolean',
    IS_ARRAY: '/docs/api/utils#isarray',
    IS_OBJECT: '/docs/api/utils#isobject',
    IS_FUNCTION: '/docs/api/utils#isfunction',
    IS_PROMISE: '/docs/api/utils#ispromise',
    IS_BUFFER: '/docs/api/utils#isbuffer',
    IS_TYPED_ARRAY: '/docs/api/utils#istypedarray'
  },
  
  [UtilsCategory.CONVERSION]: {
    MAIN: '/docs/api/utils#conversion',
    TO_BUFFER: '/docs/api/utils#tobuffer',
    TO_STRING: '/docs/api/utils#tostring',
    TO_NUMBER: '/docs/api/utils#tonumber',
    TO_BOOLEAN: '/docs/api/utils#toboolean',
    TO_ARRAY: '/docs/api/utils#toarray',
    TO_OBJECT: '/docs/api/utils#toobject',
    JSON_PARSE: '/docs/api/utils#jsonparse',
    JSON_STRINGIFY: '/docs/api/utils#jsonstringify'
  }
} as const;

// Common Bun.utils examples
export const BUN_UTILS_EXAMPLES = {
  FILE_SYSTEM: {
    READ_FILE: `import { readFile } from 'bun';
const content = await readFile('package.json', 'utf-8');`,
    
    WRITE_FILE: `import { writeFile } from 'bun';
await writeFile('output.txt', 'Hello, Bun!');`,
    
    FILE_EXISTS: `import { exists } from 'bun';
const fileExists = await exists('package.json');`
  },
  
  VALIDATION: {
    IS_TYPED_ARRAY: `import { isTypedArray } from 'bun';
const arr = new Uint8Array([1, 2, 3]);
console.log(isTypedArray(arr)); // true`,
    
    IS_BUFFER: `import { isBuffer } from 'bun';
const buf = Buffer.from('hello');
console.log(isBuffer(buf)); // true`
  },
  
  CONVERSION: {
    TO_BUFFER: `import { toBuffer } from 'bun';
const buffer = toBuffer('Hello'); // Convert string to Buffer`
  }
} as const;
