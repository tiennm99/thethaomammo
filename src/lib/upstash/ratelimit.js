import { Ratelimit } from "@upstash/ratelimit";
import { redis, APP_PREFIX } from "./redis";

export const registrationRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "10 m"),
  prefix: `${APP_PREFIX}:rl:registration`,
  analytics: false,
});
