import mongoose from "mongoose";

// Caches one GitHub contributor lookup per (team, round). GitHub allows only
// 60 unauthenticated requests per hour per IP, shared across the whole server,
// so every student page load must NOT hit the API directly.
const gitStatsCacheSchema = new mongoose.Schema(
  {
    team_id:  { type: mongoose.Schema.Types.ObjectId, ref: "Team", required: true },
    round_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    // Stored so a resubmission with a different repo invalidates the entry.
    repo_url: { type: String, required: true },
    status: {
      type: String,
      enum: ["ok", "private", "rate_limited", "unsupported", "error"],
      required: true,
    },
    payload:    { type: mongoose.Schema.Types.Mixed, default: null },
    fetched_at: { type: Date, default: Date.now },
    // The true outcome of the most recent fetch *attempt*, kept separate from
    // `status` above. A stale-on-error rescue masks `status` to "ok" so every
    // consumer (which gates on status === 'ok') keeps rendering the preserved
    // payload, but the retry backoff still needs to know the attempt actually
    // failed — otherwise a rescued `rate_limited` would read back as "ok" and
    // get the short "ok" TTL instead of the longer quota-reset backoff.
    last_attempt_status: {
      type: String,
      enum: ["ok", "private", "rate_limited", "unsupported", "error"],
      default: "ok",
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } }
);

gitStatsCacheSchema.index({ team_id: 1, round_id: 1 }, { unique: true });

const GitStatsCache = mongoose.model("GitStatsCache", gitStatsCacheSchema);
export default GitStatsCache;
