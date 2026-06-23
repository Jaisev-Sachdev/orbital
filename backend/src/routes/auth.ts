import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import requireAuth, { AuthRequest } from '../middleware/requireAuth';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

const router = Router();

// POST /auth/register
router.post('/register', async (req: Request, res: Response) => {
  const { email, password, name } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Valid email and password are required' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    res.status(400).json({ error: 'Valid email and password are required' });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(normalizedPassword, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: typeof name === 'string' && name.trim().length > 0 ? name.trim() : null
      }
    });
    res.status(201).json({ message: 'User created successfully', userId: user.id });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /auth/login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Valid email and password are required' });
    return;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const normalizedPassword = password.trim();

  if (!normalizedEmail || !normalizedPassword) {
    res.status(400).json({ error: 'Valid email and password are required' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const passwordMatch = await bcrypt.compare(normalizedPassword, user.password);
  if (!passwordMatch) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );

  res.json({ message: 'Login successful', token });
});

// GET /auth/me — get logged in user's id, email and name
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { id: true, email: true, name: true, createdAt: true }
  });

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.json({ user });
});

// PUT /auth/me — update name
router.put('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;

  if (typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({ error: 'name is required' });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.userId! },
    data: { name: name.trim() },
    select: { id: true, email: true, name: true }
  });

  res.json({ message: 'Name updated', user });
});

export default router;