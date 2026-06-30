import express from "express"
import { deleteData, setData } from "../controllers/nodeController.js"

const nodeRouter = express.Router()

nodeRouter.post('/put',setData)
nodeRouter.delete('/delete/:key',deleteData)

export default nodeRouter