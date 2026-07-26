import mongoose from 'mongoose';
import { connectDB } from '../web/backend/src/config/db.js';
import User from '../web/backend/src/models/User.js';

async function check() {
  await connectDB();
  const users = await User.find({}).lean();
  console.log('Users count:', users.length);
  for (const user of users) {
    if (user.roles && user.roles.length > 0) {
      console.log(`User: ${user.email}, Roles:`, user.roles);
    }
  }
  mongoose.connection.close();
}

check();
