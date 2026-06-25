import { Request, Response } from "express"
import pool from "../db"




export const blockTransaction = async (
    req: Request,
    res: Response
): Promise<void>  => {
   


try {
  const { id } = req.params


  const result = await pool.query(
    `
    UPDATE transactions
    SET fraud_status = 'BLOCKED'
    WHERE id = $1
    AND fraud_status = 'HIGH'
     RETURNING *`,
     [id]
  )



  if( result.rows.length === 0) {
    res.status(404).json({
        error: "Transaction not found or not HIGH risk"
    })

    return 
       }
     console.log(`Transcation BLOCKED: ${id}`)


          res.json({ 
            success: true,
            message: 'Transaction blocked!',
            transaction: result.rows[0]
        })


    } catch {
     res.status(500).json({ error: 'Server error' })

   }

}




export const getBlockedTransactions = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const result = await pool.query(
            `SELECT * FROM transactions 
             WHERE fraud_status = 'BLOCKED'
             ORDER BY created_at DESC`
        )

        res.json({ 
            blocked: result.rows,
            count: result.rows.length
        })

    } catch(err) {
        res.status(500).json({ error: 'Server error' })
    }
}
