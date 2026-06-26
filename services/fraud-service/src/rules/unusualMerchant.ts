
import redisClient from '../redis'

const HIGH_RISK_CATEGORIES = [
    'crypto',
    'gambling',
    'adult',
    'firearms',
    'forex'
]

export async function unusualMerchantRule(
    userId: string,
    merchantCategory: string
): Promise<number> {
    
    if(!merchantCategory) return 0
    
    const category = merchantCategory.toLowerCase()
    

    if(HIGH_RISK_CATEGORIES.includes(category)) {
        console.log(`High risk category: ${category}`)
        return 25
    }
    

    const key = `merchant:${userId}`
    const isSeen = await redisClient.sismember(key, category)
    
    if(!isSeen) {

        await redisClient.sadd(key, category)
        await redisClient.expire(key, 86400 * 30) // 30 days
        

        const totalCategories = await redisClient.scard(key)
        if(totalCategories === 1) return 0
        

        console.log(`New merchant category for ${userId}: ${category}`)
        return 15
    }
    
    return 0
}