import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

// Encryption key from environment variables
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY is not defined in environment variables');
}

export interface IUser extends Document {
  googleId: string;
  email: string;
  name: string;
  encryptedRefreshToken: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    googleId: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    encryptedRefreshToken: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

// Helper methods for token encryption/decryption
UserSchema.methods.encryptToken = function(token: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(token);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

UserSchema.methods.decryptToken = function(encryptedToken: string): string {
  const [ivHex, encryptedHex] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

export const User = mongoose.model<IUser>('User', UserSchema); 