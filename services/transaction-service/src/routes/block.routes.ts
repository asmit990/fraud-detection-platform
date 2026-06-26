import { Router } from 'express'
import { blockTransaction, getBlockedTransactions } from '../controller/block.controller'

const router = Router()

router.post('/:id/block', blockTransaction)
router.get('/blocked', getBlockedTransactions)

export default router