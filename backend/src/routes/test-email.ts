import express, { Response } from 'express';
import { authenticateAdmin, AuthRequest } from '../middleware/auth';
import { sendMagicLink } from '../services/emailService';
import { testEmailLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Send test email
router.post('/', authenticateAdmin, testEmailLimiter, async (req: AuthRequest, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  try {
    // Send a test email using the existing magic link template
    // but with test content
    const testLink = `${process.env.APP_URL || 'http://localhost:3003'}`;
    
    await sendMagicLink(
      email,
      'Test User',
      'THIS IS A TEST EMAIL ONLY',
      testLink,
      'This is a test email to verify your SMTP configuration is working correctly.'
    );

    res.json({ 
      message: 'Test email sent successfully',
      sentTo: email
    });
  } catch (error: any) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      error: 'Failed to send test email',
      details: error.message
    });
  }
});

export default router;
