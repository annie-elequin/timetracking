import dotenv from 'dotenv';

dotenv.config();

export function getMongoDBUri(): string {
  const username = process.env.MONGO_ROOT_USERNAME;
  const password = process.env.MONGO_ROOT_PASSWORD;
  const host = process.env.MONGODB_HOST || 'mongodb';  // default to 'mongodb' for docker service name
  const port = process.env.MONGODB_PORT || '27017';    // default MongoDB port
  const database = process.env.MONGODB_DATABASE || 'timetracking';
  const authSource = process.env.MONGODB_AUTH_SOURCE || 'admin';

  console.log('MongoDB Connection Details:', {
    username,
    host,
    port,
    database,
    authSource,
    // Don't log the actual password
    hasPassword: !!password
  });

  if (!username || !password) {
    throw new Error('MongoDB credentials not found in environment variables');
  }

  const uri = `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=${authSource}`;
  console.log('MongoDB URI (without password):', uri.replace(password, '****'));
  return uri;
} 