import redis from "../redis";

export default async function velocityRule(
  user_id: string
): Promise<number> {
  const key = `velocity:${user_id}`;

  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 600);
  }

  if (count > 5) {
    return 30;
  }

  return 0;
}