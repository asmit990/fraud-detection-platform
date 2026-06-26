import redisClient from '../redis'


const BLACKLISTED_IPS = [
    '192.168.1.100',
    '10.0.0.50'
]



export async function ipReputation(ip: string): Promise<number> {
    if(!ip) return 0


  if(BLACKLISTED_IPS.includes(ip)) {
        console.log(`Blacklisted IP: ${ip}`)
        return 35
    }



   const userCountKey = `ip:users:${ip}`
   const userCount = await redisClient.incr(userCountKey)
   if(userCount === 1) {
    await redisClient.expire(userCountKey, 3600)
   }

   if(userCount > 10) {
    console.log(`TOO MANY USERS FROM IP:  ${ip} -> ${userCount}`)
    return 35
   }



    const txnCountKey = `ip:txns:${ip}`
    const txnCount = await redisClient.incr(txnCountKey)
    if(txnCount === 1) {
        await redisClient.expire(txnCountKey, 3600)
    }
    
    if(txnCount > 20) {
        console.log(`Too many transactions from IP: ${ip}`)
        return 25
    }
    
    return 0

}

export async function blacklistIP(ip: string): Promise<void> {
    await redisClient.set(`blacklist:${ip}`, '1')
    console.log(`IP blacklisted: ${ip}`)
}