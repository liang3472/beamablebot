import 'dotenv/config'

export const WRDO_AK = process.env.WRDO_AK;
export const LIMIT = process.env.LIMIT || 1;
export const CODES = process.env.CODES?.split(',') ?? [];
export const EACH_COUNT = process.env.EACH_COUNT || 10;
export const CLIPROXY_USERNAME = process.env.CLIPROXY_USERNAME;
export const CLIPROXY_PASSWORD = process.env.CLIPROXY_PASSWORD;
export const CLIPROXY_KEY = process.env.CLIPROXY_KEY;
export const CAPSOLVER_AK = process.env.CAPSOLVER_AK;