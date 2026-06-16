


//receives user_id + device_id
//    check redis → known devices for this user
 //   if device not seen before → return 25
 //   save device to redis
 //   else → return 0


import redis from "../redis";

export default async function deviceAnomalyRule(userId: string, deviceId: string): Promise<number> {
  
    const device = await redis.get(`device:${userId}`);
   
    await redis.set(`device:${userId}`, deviceId);

    if (device && device !== deviceId) {
        return 25;
    }
    else {
        return 0;
    }
}