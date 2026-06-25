import mongoose from 'mongoose';

const teamInvitationSchema = new mongoose.Schema({
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  contest_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Contest',
    default: null,
  },
  invitee_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  invitee_user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  invited_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'expired'],
    default: 'pending',
  },
  expires_at: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// Prevent duplicate pending invite for same person in same team
teamInvitationSchema.index({ team_id: 1, invitee_email: 1 }, { unique: true });
teamInvitationSchema.index({ invitee_user_id: 1, status: 1 });

const TeamInvitation = mongoose.model('TeamInvitation', teamInvitationSchema);
export default TeamInvitation;
