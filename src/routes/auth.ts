import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import { User } from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import { CookieOptions } from 'express';
import * as crypto from 'crypto';

const router = Router();

export const initAuthRoutes = (oauth2Client: OAuth2Client, isProduction: boolean) => {
  // Set secure cookie options based on environment
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000, // 1 hour
  };

  router.get('/status', async (req: Request, res: Response) => {
    try {
      const accessToken = req.cookies.access_token;
      if (!accessToken) {
        return res.json({ isAuthenticated: false });
      }

      // Verify the token is still valid
      oauth2Client.setCredentials({ access_token: accessToken });
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      await calendar.calendars.get({ calendarId: 'primary' });
      
      res.json({ isAuthenticated: true });
    } catch (error) {
      // Token is invalid or expired
      res.clearCookie('access_token');
      res.json({ isAuthenticated: false });
    }
  });

  router.get('/google', (req: Request, res: Response) => {
    const state = uuidv4(); // Generate a random state for CSRF protection
    res.cookie('oauth_state', state, cookieOptions);
    
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar.readonly'],
      state: state,
    });
    res.redirect(url);
  });

  router.get('/google/callback', async (req: Request, res: Response) => {
    try {
      const { code, state } = req.query;
      const storedState = req.cookies.oauth_state;

      // Verify state to prevent CSRF
      if (!state || !storedState || state !== storedState) {
        throw new Error('Invalid state parameter');
      }

      if (!code || typeof code !== 'string') {
        throw new Error('Invalid authorization code');
      }

      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens.refresh_token) {
        throw new Error('No refresh token received');
      }

      // Get user info from Google
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const { data: userInfo } = await oauth2.userinfo.get();

      if (!userInfo.id || !userInfo.email || !userInfo.name) {
        throw new Error('Missing user information from Google');
      }

      // Find or create user
      let user = await User.findOne({ googleId: userInfo.id });
      if (!user) {
        user = new User({
          googleId: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          encryptedRefreshToken: '', // Will be set below
        });
      }

      // Encrypt and store refresh token
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', 
        Buffer.from(process.env.ENCRYPTION_KEY!), 
        iv
      );
      const encryptedToken = Buffer.concat([
        iv,
        cipher.update(tokens.refresh_token),
        cipher.final()
      ]).toString('hex');
      
      user.encryptedRefreshToken = encryptedToken;
      await user.save();

      // Set access token in cookie
      res.cookie('access_token', tokens.access_token || '', cookieOptions);
      res.clearCookie('oauth_state');

      // Redirect to frontend
      if (isProduction) {
        res.redirect('https://timetracking.elequin.io');
      } else {
        res.redirect('http://localhost:3001');
      }
    } catch (error) {
      console.error('Error in auth callback:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const accessToken = req.cookies.access_token;
      if (!accessToken) {
        return res.status(401).json({ error: 'No access token' });
      }

      // Get user from database using the access token
      const user = await User.findOne({ /* find by some identifier */ });
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Decrypt refresh token
      const encryptedData = Buffer.from(user.encryptedRefreshToken, 'hex');
      const iv = encryptedData.subarray(0, 16);
      const encryptedToken = encryptedData.subarray(16);
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', 
        Buffer.from(process.env.ENCRYPTION_KEY!), 
        iv
      );
      const refreshToken = Buffer.concat([
        decipher.update(encryptedToken),
        decipher.final()
      ]).toString();

      oauth2Client.setCredentials({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      // Get new tokens
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update access token cookie
      res.cookie('access_token', credentials.access_token || '', cookieOptions);
      res.json({ success: true });
    } catch (error) {
      console.error('Error refreshing token:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  });

  router.post('/logout', (req: Request, res: Response) => {
    res.clearCookie('access_token');
    res.json({ success: true });
  });

  return router;
}; 