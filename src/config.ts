import * as dotenv from 'dotenv';
import path from 'path';
console.log("Loading .env from:", path.resolve(process.cwd(), '.env'));
dotenv.config();

function getEnv(name: string, required = true): string {
  const value = process.env[name];
  if (required && (!value || value.trim() === '')) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value!;
}

console.log("process.env.USERNAME =", process.env.USERNAME);


export const config = {
  token: getEnv('TOKEN'),
  username: getEnv('USER'),
  userId: parseInt(getEnv('USERID'), 10),
  baseUrl: getEnv('URL'),
  GUID: getEnv('QUERY_GUID'),
};
console.log("Config loaded:", config);