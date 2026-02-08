import { AUTH, DEFAULT_PORT, DEFAULT_HOSTNAME, DEFAULT_TEST_PORT, DB } from '../config';

const docs = `# Environment Configuration

## Required Variables
${AUTH.API_TOKEN_ENV}=<your-api-token>

## Optional Variables
STUFF_PORT=${DEFAULT_PORT}
STUFF_HOSTNAME=${DEFAULT_HOSTNAME}
STUFF_DB_PATH=${DB.DEFAULT_PATH}

## Generated Config
- Auth Token Env: ${AUTH.API_TOKEN_ENV}
- Default Port: ${DEFAULT_PORT}
- Test Port: ${DEFAULT_TEST_PORT}
`;

console.log(docs);
