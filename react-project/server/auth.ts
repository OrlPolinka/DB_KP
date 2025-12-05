import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'dev_secret_key';

export interface SessionUser {
  UserID: number;
  Username: string;
  Email?: string;
  RoleName: 'User' | 'Admin';
}

export const signToken = (user: SessionUser) => jwt.sign(user, secret, { expiresIn: '8h' });

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const hdr = req.headers.authorization;
  if (!hdr) return res.status(401).json({ error: 'Требуется авторизация' });
  try {
    (req as any).user = jwt.verify(hdr.slice(7), secret);
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

export const requireRole = (role: 'User' | 'Admin') => (
  req: Request, res: Response, next: NextFunction
) => {
  const u = (req as any).user as SessionUser | undefined;
  if (!u) return res.status(401).json({ error: 'Требуется авторизация' });
  if (u.RoleName !== role) return res.status(403).json({ error: `Требуется роль ${role}` });
  next();
};
