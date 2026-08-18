import { Redis } from "@upstash/redis";

export const redis = Redis.fromEnv();

export const APP_PREFIX = "thethaomammo";

/** @param {(string | number)[]} parts */
export function key(...parts) {
  return [APP_PREFIX, ...parts].join(":");
}
