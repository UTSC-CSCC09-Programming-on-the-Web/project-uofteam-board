import jwt from "jsonwebtoken";

export function createJWT(userId: number): string {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: "7d" });
}
