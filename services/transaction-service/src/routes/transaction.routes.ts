import express from "express";



const app = express();



app.get("/transactions", (req, res) => {

})

app.post("/transactions", (req, res) => {

})


app.get("/transactions/:id", (req, res) => {

})

app.listen(3000, () => {
    console.log("Transaction service running on port 3000");
})  