import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { findOrCreateOAuthUser } from "../services/authService.js";

const SERVER_URL = process.env.SERVER_URL || "http://localhost:5001";

// Google OAuth – only register if credentials are provided
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/google/callback`,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const user = await findOrCreateOAuthUser({
            provider: "google",
            provider_id: profile.id,
            email: profile.emails[0].value,
            full_name: profile.displayName,
            avatar_url: profile.photos?.[0]?.value || "",
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️  Google OAuth credentials not found – Google login disabled");
}

// GitHub OAuth – only register if credentials are provided
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${SERVER_URL}/api/auth/github/callback`,
        scope: ["user:email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email =
            profile.emails?.[0]?.value ||
            `${profile.username}@users.noreply.github.com`;
          const user = await findOrCreateOAuthUser({
            provider: "github",
            provider_id: String(profile.id),
            email,
            full_name: profile.displayName || profile.username,
            avatar_url: profile.photos?.[0]?.value || "",
          });
          done(null, user);
        } catch (err) {
          done(err, null);
        }
      }
    )
  );
} else {
  console.warn("⚠️  GitHub OAuth credentials not found – GitHub login disabled");
}

export default passport;
