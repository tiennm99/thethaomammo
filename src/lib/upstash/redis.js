import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const APP_PREFIX = "thethaomammo";

export function key(...parts: (string | number)[]) {
  return [APP_PREFIX, ...parts].join(":");
}
