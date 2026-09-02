// rules/multipleFailedAttempts.ts
import redisClient from '../redis'

export async function multipleFailedAttemptsRule(
    userId: string
): Promise<number> {
    
    const key = `failed:${userId}`
    const count = await redisClient.get(key)
    
    if(!count) return 0
    
    const failedCount = parseInt(count)
    

    if(failedCount >= 5) return 30  
    if(failedCount >= 3) return 15  
    
    return 0
}


export async function recordFailedAttempt(
    userId: string
): Promise<void> {
    const key = `failed:${userId}`
    const count = await redisClient.incr(key)
    
    if(count === 1) {
        await redisClient.expire(key, 3600) 
    }
    
    console.log(`Failed attempts for ${userId}: ${count}`)
}


export async function resetFailedAttempts(
    userId: string
): Promise<void> {
    await redisClient.del(`failed:${userId}`)
}