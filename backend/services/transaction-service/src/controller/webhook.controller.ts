import { Request, Response } from 'express'
import { createHmac, timingSafeEqual } from 'crypto'
import pool from '../db'

export const razorpayWebhook = async (
    req: Request,
    res: Response
): Promise<void> => {
    
   
    const signature = req.headers['x-razorpay-signature'] as string
    
 const expectedSig = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
        .update(req.body)  // raw body!
        .digest('hex')
    
    if(signature !== expectedSig) {
       res.status(400).json({ error: 'Invalid signature!' })
        return
   }
    
    const event = JSON.parse(req.body.toString())
    
    console.log(`Razorpay Event: ${event.event}`)
    
    // 2. Event handle karo
    switch(event.event) {
        case 'payment.captured':
            await handlePaymentCaptured(event.payload.payment.entity)
            break
            
        case 'payment.failed':
            await handlePaymentFailed(event.payload.payment.entity)
            break
    }
    
    // 3. 200 zaroori!
    res.status(200).json({ received: true })
}

async function handlePaymentCaptured(payment: any) {
    console.log(`Payment captured: ${payment.id}`)
    console.log(`Amount: ${payment.amount / 100} INR`)
    
    // Fraud Detection mein bhejo!
    await fetch('http://localhost:3001/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: payment.email || payment.contact,
            amount: payment.amount / 100,
            country: payment.international ? 'OTHER' : 'IN',
            device_id: payment.id,
            currency: payment.currency
        })
    })
}

async function handlePaymentFailed(payment: any) {
    console.log(`Payment failed: ${payment.id}`)
    console.log(`Reason: ${payment.error_description}`)
}