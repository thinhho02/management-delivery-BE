import Jwt from "jsonwebtoken";


export interface AccessTokenPayload {
  sub: string;
  sid: string;
  role: string;
  type: "access";
  iat?: number;
  exp?: number;
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  role: string;
  remember: boolean;
  type: "refresh";
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (payload: AccessTokenPayload) => {
  if (!process.env.JWT_KEY) {
    throw new Error("Missing JWT_KEY in environment variables");
  }
  return Jwt.sign(payload, process.env.JWT_KEY, { expiresIn: "10m" });
};

export const generateRefreshToken = (payload: RefreshTokenPayload) => {
  if (!process.env.JWT_REFRESH_KEY) {
    throw new Error("Missing JWT_REFRESH_KEY in environment variables");
  }
  return Jwt.sign(
    {
      sub: payload.sub,
      sid: payload.sid,
      role: payload.role,
      type: "refresh"
    },
    process.env.JWT_REFRESH_KEY,
    {
      expiresIn: payload.remember ? "365d" : "1d",
    }
  );
};
