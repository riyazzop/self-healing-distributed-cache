import express from "express"
import { deleteData, getData, setData } from "../controllers/nodeController.js"

const nodeRouter = express.Router()

nodeRouter.post('/put',setData)
nodeRouter.delete('/delete/:key',deleteData)
nodeRouter.get('/get/:key',getData)

export default nodeRouter