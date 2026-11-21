import redis from "../redis";

export default async function geoAnomalyRule(
   userId: string,
   country: string
): Promise<number> {
   const key = `geo:${userId}`;

   const previousCountry = await redis.get(key);

   await redis.set(key, country);

   if (previousCountry && previousCountry !== country) {
      return 30;
   }

   return 0;
}
