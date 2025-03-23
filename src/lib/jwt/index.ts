import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'running-crew-map-secret-key';  // 실제 환경에서는 반드시 환경변수 사용
const JWT_EXPIRES_IN = '24h';  // 토큰 만료 시간

export interface JwtPayload {
  userId: string;
  crewId: string | null | "";
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    console.error('토큰 검증 실패:', error);
    return null;
  }
}; 