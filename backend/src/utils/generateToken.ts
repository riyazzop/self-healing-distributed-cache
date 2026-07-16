import jwt from "jsonwebtoken";
import type { JwtPayload } from "../nodeManager.js";

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not present in env")
}
export const generateToken = (user: JwtPayload) => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30d" });
};

export const decodeToken = (token: string) : JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
