import "dotenv/config";
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import User from '../src/models/User.js';

async function check() {
  await connectDB();
  const users = await User.find({}).lean();
  for (const user of users) {
    if (user.roles) {
      const match = user.roles.find(r => r.role_name === 'admin' || r.role_name === 'coordinator');
      if (match) {
        console.log(`User: ${user.email}, Roles:`, user.roles.map(r => r.role_name));
      }
    }
  }
  mongoose.connection.close();
}

check();
