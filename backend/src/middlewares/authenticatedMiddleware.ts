import { NextFunction, Request, Response } from "express";
import { getNodeHashFromUsername } from "../utils/hash.js";
import { nodes } from "../utils/nodeUtils.js";
import { decodeToken } from "../utils/generateToken.js";
import { JwtPayload } from "../nodeManager.js";

export interface AuthenticatedRequest extends Request{
    user?:{
        name:string,
        nodeid:number,
        nodePort:string
    }
}

export const authenticatedMiddleware=(req:AuthenticatedRequest,res:Response,next:NextFunction)=>{
    let token = req.headers.authorization
    if (!token) {
        return res.status(400).json({message: "Token is missing from headers"})
    }
    if (token.startsWith("Bearer")) {
        token = token.split(" ")[1]
    }
    const decodedUser:JwtPayload = decodeToken(token)
    const {name} = decodedUser
    
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