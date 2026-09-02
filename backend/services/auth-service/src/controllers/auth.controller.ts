import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";
import { User, UserPublic, RegisterBody, LoginBody, JwtPayload } from "../types";

const SALT_ROUNDS = 10;

function toPublic(user: User): UserPublic {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at,
  };
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "7d" });
}

// POST /api/auth/register
export async function register(
  req: Request<{}, {}, RegisterBody>,
  res: Response
): Promise<void> {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ message: "name, email and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ message: "Password must be at least 8 characters" });
    return;
  }

  try {
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query<User>(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), email.trim().toLowerCase(), password_hash]
    );

    const user = result.rows[0];
    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = signToken(payload);

    res.status(201).json({ token, user: toPublic(user) });
  } catch (err: any) {
    // Postgres unique_violation code
    if (err.code === "23505") {
      res.status(409).json({ message: "An account with that email already exists" });
      return;
    }
    console.error("register error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// POST /api/auth/login
export async function login(
  req: Request<{}, {}, LoginBody>,
  res: Response
): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ message: "email and password are required" });
    return;
  }

  try {
    const result = await pool.query<User>(
      `SELECT * FROM users WHERE email = $1`,
      [email.trim().toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const payload: JwtPayload = { id: user.id, email: user.email, role: user.role };
    const token = signToken(payload);

    res.status(200).json({ token, user: toPublic(user) });
  } catch (err) {
    console.error("login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}

// GET /api/auth/me  (protected)
export async function me(req: Request, res: Response): Promise<void> {
  try {
    const result = await pool.query<User>(
      `SELECT * FROM users WHERE id = $1`,
      [req.user!.id]
    );

    const user = result.rows[0];

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({ user: toPublic(user) });
  } catch (err) {
    console.error("me error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
}
