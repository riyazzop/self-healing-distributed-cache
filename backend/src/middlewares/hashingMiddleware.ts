import { NextFunction, Request, Response } from "express";
import { getNodeHashFromUsername } from "../utils/hash.js";

export interface HashedRequest extends Request{
    user?:{
        name:string,
        nodeid:number
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
        nodeid:nodeId
    }
    req.user=user
    next()
}