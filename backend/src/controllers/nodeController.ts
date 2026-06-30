import { Response } from "express"
import {  HashedRequest } from "../middlewares/hashingMiddleware.js"
import { nodes } from "../utils/nodeUtils.js"
import { getReplicaNodePort } from "../utils/hash.js"
import { deleteDataInCache, setDataInCache } from "../repositories/nodeRepositories.js"
import { delay } from "../utils/delay.js"
import axios from "axios"


export const setData = async (req:HashedRequest,res:Response)=>{
    const nodeid =req.user?.nodeid
    const nodePort=nodes.find(node=>node.nodeId===`NODE-0${nodeid}`)?.port as string
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

export const deleteData=async (req:HashedRequest,res:Response) => {
    const nodeid =req.user?.nodeid
    const nodePort=nodes.find(node=>node.nodeId===`NODE-0${nodeid}`)?.port as string
    const key = String(req.params.key)
    
    if(!key){
        return res.status(400).json({message:"Key is required to delete"})
    }
    let primaryDeleted = false;
    let replicaDeleted = false;
    //deleting from primary node
    try {
        await deleteDataInCache(nodePort,key)
        primaryDeleted = true
    } catch (error) {
        console.log("Deletion failed , retrying after 8s....");
        await delay(8)
        try {
            await deleteDataInCache(nodePort,key)   
            primaryDeleted=true         
        } catch (error) {
            console.log("Deletion failed after retry....");
            
        }
    }
    //deleting from replica node
    const replicaNodePort = getReplicaNodePort(nodePort)
    try {
        await deleteDataInCache(replicaNodePort,key)
        replicaDeleted = true
    } catch (error) {
        console.log("Deletion failed , retrying after 8s....");
        await delay(8)
        try {
            await deleteDataInCache(replicaNodePort,key)            
            replicaDeleted =true
        } catch (error) {
            console.log("Deletion failed after retry....");
        }
    }
     if(!primaryDeleted && !replicaDeleted){
        return res.status(404).json({message:`${key} not exists in cache`})
     }
    if(!primaryDeleted){
        return res.status(500).json({
            message:"Failed to delete on primary node ",
            
        })
    }
   
    return res.status(200).json({message:"Deletion successfull"})

}

