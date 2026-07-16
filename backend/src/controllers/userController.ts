import { Request, Response } from "express";
import { JwtPayload, User, users } from "../nodeManager.js";
import { generateToken } from "../utils/generateToken.js";

export const userRegister = (req: Request, res: Response) => {
  const { email, password } = req.body;
  const name = (email as string).split("@")[0]
  if (!name || !email || !password) {
    return res.status(400).json({ message: "All properties required" });
  }
  const user: User = {
    name,
    email,
    password,
  };
  if (users.find((user) => user.email == email)) {
    return res
      .status(400)
      .json({ message: "User already exists, please login" });
  }
  users.push(user);
  const jwtPayload: JwtPayload = { name, email };
  const token = generateToken(jwtPayload);
  return res.status(200).json({ message: "User created successfully", token });
};

export const loginUser = (req: Request, res: Response)=>{
    const {email,password} = req.body
    if (!email || !password) {
        return res.status(400).json({message: "All fields required"})
    }
    const user = users.find(u => u.email === email)
    if(!user){
      return res.status(404).json({message:"user not found, please register"})
    }
    if(user.password !== password){
      return res.status(401).json({message:"Invalid credentials"})
    }
    const jwtPayload: JwtPayload = { name: user.name, email }
    const token = generateToken(jwtPayload)
    return res.status(200).json({ message: "Login successful", token })
}
