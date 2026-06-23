export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: "analyst" | "admin";
  created_at: string;
}

export interface UserPublic {
  id: string;
  name: string;
  email: string;
  role: "analyst" | "admin";
  created_at: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: "analyst" | "admin";
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
}

export interface LoginBody {
  email: string;
  password: string;
}
