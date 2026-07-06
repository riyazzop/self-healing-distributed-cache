import { NextFunction, Request, Response } from "express";
import { getNodeHashFromUsername } from "../utils/hash.js";
import { nodes } from "../utils/nodeUtils.js";

export interface HashedRequest extends Request{
    user?:{
        name:string,
        nodeid:number,
        nodePort:string
    }
}

export const hashingMiddleware=(req:HashedRequest,res:Response,next:NextFunction)=>{
    const {name} = req.body
    if (!name) {
        return res.status(400).json({Message:"Name is required in body"})
    }
    const nodeId = getNodeHashFromUsername(name)
    const user ={
        name,
        nodeid:nodeId,
        nodePort:nodes.find(node=>node.nodeId===`NODE-0${nodeId}`)?.port as string
    }
    console.log(user.nodePort);
    
    req.user=user
    next()
}