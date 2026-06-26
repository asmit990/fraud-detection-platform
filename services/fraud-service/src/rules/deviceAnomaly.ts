

import redis from "../redis";

export default async function deviceAnomalyRule( userId: string, 
    deviceId: string,
    userAgent?: string,
    ip?: string): Promise<number> {
  

        const key = `devices:${userId}`

        const knownDevices = await redis.smembers(key)

        const fingerprint = `${deviceId}:${userAgent}:${ip}`

        const isSeen = await redis.sismember(key, fingerprint)

       
    if(!isSeen) {
        await redis.sadd(key, fingerprint)


        if(knownDevices.length === 0) return 0

        if(knownDevices.length > 5) return 40


        return 25
    }

    return 0
}