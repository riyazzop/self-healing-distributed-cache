import { Response } from "express"
import { HashedRequest } from "../middlewares/hashingMiddleware.js"
import { getReplicaNodePort } from "../utils/hash.js"
import { deleteDataInCache, getDataFromNode, setDataInCache } from "../repositories/nodeRepositories.js"
import { delay } from "../utils/delay.js"



export const setData = async (req:HashedRequest,res:Response)=>{
    
    const nodePort=req.user?.nodePort as string
    const {key,value} = req.body
    if(!key || ! value){
        return res.status(400).json({message:"(key,value) required to put data in cache"})
    }
    let result;
    //setting data in primary node
    console.log("Primary node port :",nodePort);
    
    try {
        result = await setDataInCache(nodePort,{key,value,type:"primary"})
    } catch (error) {
        console.log("primary write failed, waiting 8s for node to recover....");
        await delay(8)
        try {
            result = await setDataInCache(nodePort,{key,value,type:"primary"})
            console.log("Primary write successful after retry");
            
        } catch (error) {
            return res.status(500).json({message:"Primary node write failed after retry"})
        }
        
    }
    //setting data in replica node
    const replicaNodePort = getReplicaNodePort(nodePort)
    try {
        await setDataInCache(replicaNodePort,{key,value,type:"replica"})
    } catch (error) {
        console.log("replica write failed, waiting 8s for node to recover....");
        await delay(8)
        try {
            await setDataInCache(replicaNodePort,{key,value,type:"replica"})
            console.log("Replica write successful after retry");
        } catch (error) {
            console.log("replica write failed permanently, continuing anyway...");
            
        }
        
    }
    res.status(200).json(result)

}

export const deleteData = async (req: HashedRequest, res: Response) => {

    const nodePort = req.user?.nodePort as string;
    const key = String(req.params.key)

    let primaryDeleted = false;
    let replicaDeleted = false;

    // Primary node
    try {
        const data = await deleteDataInCache(nodePort, key)
        
        primaryDeleted = data?.success === true
    } catch (error) {
        console.log("Deletion failed on primary, retrying after 8s...");
        await delay(8)
        try {
            const data = await deleteDataInCache(nodePort, key)
            primaryDeleted = data?.success === true
        } catch (error) {
            console.log("Primary deletion failed after retry.");
        }
    }

    // Replica node 
    const replicaNodePort = getReplicaNodePort(nodePort)
    try {
        const data = await deleteDataInCache(replicaNodePort, key)
        replicaDeleted = data?.success === true
    } catch (error) {
        console.log("Deletion failed on replica, retrying after 8s...");
        await delay(8)
        try {
            const data = await deleteDataInCache(replicaNodePort, key)
            replicaDeleted = data?.success === true
        } catch (error) {
            console.log("Replica deletion failed after retry.");
        }
    }

    // Result
    if (!primaryDeleted && !replicaDeleted) {
        return res.status(404).json({ message: `Key "${key}" not found in cache` })
    }
    if (!primaryDeleted) {
        return res.status(500).json({ message: "Deleted from replica but primary delete failed" })
    }
    return res.status(200).json({ message: "Deletion successful" })
}


export const getData = async (req: HashedRequest, res: Response) => {
    const nodePort = req.user?.nodePort as string;
    const key = String(req.params.key)

    //  primary node
    try {
        const data = await getDataFromNode(nodePort, key)
        if (!data.success) {
            return res.status(404).json(data)
        }
        return res.status(200).json(data)
    } catch (error) {
        console.log("Data retrieval failed from primary node, retrying from replica...");
    }

    // replica node
    const replicaNodePort = getReplicaNodePort(nodePort)
    try {
        const data = await getDataFromNode(replicaNodePort, key)
        if (!data.success) {
            return res.status(404).json(data)
        }
        return res.status(200).json(data)
    } catch (error) {
        console.log("Data retrieval failed from replica node too.");
        return res.status(503).json({ message: "Both primary and replica nodes are unavailable" })
    }
}

