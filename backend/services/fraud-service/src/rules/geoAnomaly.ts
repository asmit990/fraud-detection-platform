
import redis from "../redis";

export default async function geoAnomalyRule(
   userId: string, country: string
): Promise<number> {
    
     const deivce = await redis.get(`geo:${userId}`);
   
     await redis.set(`geo:${userId}`, country);

     if (deivce && deivce !== country) {
        return 30;
     }
     else {
        return 0;
     }
}