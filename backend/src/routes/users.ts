import { Router } from 'express';
import { randomUUID } from 'crypto';
import { readUsers, writeUsers, findUserByUsername, addUser, User } from '../storage/fileStorage';

const router = Router();

/**
 * @swagger
 * /api/users/register:
 *   post:
 *     summary: Register or get existing user
 *     description: Register a new user by username, or return existing user if username already exists
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *             properties:
 *               username:
 *                 type: string
 *                 description: Desired username
 *                 example: john_doe
 *     responses:
 *       200:
 *         description: User registered or retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId:
 *                   type: string
 *                   format: uuid
 *                   example: 550e8400-e29b-41d4-a716-446655440000
 *                 username:
 *                   type: string
 *                   example: john_doe
 *       400:
 *         description: Username is required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', (req, res) => {
  try {
    const { username } = req.body;

    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Check if user already exists
    const existingUser = findUserByUsername(username);
    
    if (existingUser) {
      console.log(`[Users] Returning existing user: ${username}`);
      return res.json({
        userId: existingUser.userId,
        username: existingUser.username,
      });
    }

    // Create new user
    const newUser: User = {
      userId: randomUUID(),
      username,
      createdAt: Date.now(),
    };

    addUser(newUser);
    console.log(`[Users] Created new user: ${username} with ID: ${newUser.userId}`);

    return res.json({
      userId: newUser.userId,
      username: newUser.username,
    });
  } catch (error) {
    console.error('[Users] Error in register:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all registered users (for debugging purposes)
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', (req, res) => {
  try {
    const users = readUsers();
    return res.json({ users });
  } catch (error) {
    console.error('[Users] Error getting users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
