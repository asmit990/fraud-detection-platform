import { Router } from 'express'
import express from 'express'
import { razorpayWebhook } from '../controller/webhook.controller'

const router = Router()

// Raw body chahiye signature verify ke liye!
router.post(
    '/razorpay',
    express.raw({ type: 'application/json' }),
    razorpayWebhook
)

export default router