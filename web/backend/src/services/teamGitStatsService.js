import Team from "../models/Team.js";
import User from "../models/User.js";
import Submission from "../models/Submission.js";
import GitStatsCache from "../models/GitStatsCache.js";
import { getContributorStats, parseGithubRepoUrl } from "./githubService.js";
import { matchContributorsToMembers } from "../utils/gitIdentity.js";

// GitHub allows 60 unauthenticated requests/hour per IP, shared server-wide.
// A generous TTL is what keeps this feature from starving the admin flow.
export const TTL_MS = 30 * 60 * 1000;
// Transient failures should be retried sooner than successes expire.
export const ERROR_TTL_MS = 2 * 60 * 1000;
// GitHub's unauthenticated quota resets on a rolling 1-hour window, so
// retrying a rate-limited repo every 2 minutes is pointless — back off to
// the quota-reset horizon instead.
export const RATE_LIMITED_TTL_MS = 60 * 60 * 1000;

// `private` is not a transient failure — it is a persistent property of the
// repo that will not change for hours or days. Treating it like a fleeting
// error (2-minute TTL) meant every refresh re-fetched and burned a 404
// against the shared 60/h quota. Give it the same long TTL as a success.
// `rate_limited` gets its own even-longer TTL (see above). Only genuinely
// transient conditions (`error`) keep the short retry window.
const ttlFor = (status) => {
  if (status === "ok" || status === "private") return TTL_MS;
  if (status === "rate_limited") return RATE_LIMITED_TTL_MS;
  return ERROR_TTL_MS;
};

const isFresh = (entry) => {
  if (!entry) return false;
  const age = Date.now() - new Date(entry.fetched_at).getTime();
  return age < ttlFor(entry.status);
};

const shape = (entry) => ({
  status: entry.status,
  repo_url: entry.repo_url,
  fetched_at: entry.fetched_at,
  ...(entry.payload ?? {}),
});

/**
 * Read git stats for one team+round.
 *
 * `allowFetch: false` means cache-only — it will never call GitHub. The student
 * Overview page uses that mode so a dashboard load can never burn API quota;
 * only the Team page (where the user deliberately navigated) may refresh.
 */
export const getTeamGitStats = async ({ teamId, roundId, allowFetch = false }) => {
  const submission = await Submission.findOne({ team_id: teamId, round_id: roundId })
    .sort({ created_at: -1 })
    .lean();

  if (!submission?.repo_url) return { status: "not_submitted", repo_url: null };

  const repoUrl = submission.repo_url;
  const cached = await GitStatsCache.findOne({ team_id: teamId, round_id: roundId }).lean();

  // A resubmission with a different repo invalidates the entry.
  if (cached && cached.repo_url === repoUrl && isFresh(cached)) return shape(cached);

  if (!parseGithubRepoUrl(repoUrl)) {
    return { status: "unsupported", repo_url: repoUrl, fetched_at: null };
  }

  if (!allowFetch) {
    // Cache-only caller and nothing usable cached.
    return { status: "cold", repo_url: repoUrl, fetched_at: null };
  }

  let status = "ok";
  let payload = null;
  try {
    const { contributors } = await getContributorStats(repoUrl);

    const team = await Team.findById(teamId).select("members").lean();
    const memberUserIds = (team?.members ?? []).map((m) => m.user_id).filter(Boolean);
    const users = await User.find({ _id: { $in: memberUserIds } })
      .select("_id provider provider_id github_username")
      .lean();
    const userById = new Map(users.map((u) => [String(u._id), u]));

    const members = (team?.members ?? []).map((m) => ({
      email: m.email,
      full_name: m.full_name || "",
      user: m.user_id ? userById.get(String(m.user_id)) ?? {} : {},
    }));

    const { rows, unmatched, membersWithoutActivity } =
      matchContributorsToMembers(contributors, members);

    payload = {
      contributors: rows,
      unmatched_count: unmatched.length,
      members_without_activity: membersWithoutActivity,
      total_commits: rows.reduce((sum, r) => sum + r.commit_count, 0),
      members_total: members.length,
      members_with_activity: members.length - membersWithoutActivity.length,
    };
  } catch (err) {
    if (err.statusCode === 404) status = "private";
    else if (err.statusCode === 429) status = "rate_limited";
    else status = "error";
    console.error("[teamGitStatsService]", status, err.message);

    // A transient failure (network blip, GitHub 5xx, momentary rate limit)
    // must not erase a previously good payload: the cache-only Overview
    // reads this same document, so wiping it turns "slightly stale" into
    // "blank" on a single bad request, with no way to recover except a
    // teammate manually revisiting the Team page. Serve stale-on-error
    // instead — keep the last-known-good payload and report "ok" (what
    // every consumer already gates on) so one blip stays invisible.
    // `private` is deliberately excluded: it is a real state change (see
    // ttlFor above), not a transient failure, so it must be reported
    // honestly instead of papered over with old data.
    if ((status === "error" || status === "rate_limited") && cached?.status === "ok" && cached.payload) {
      status = "ok";
      payload = cached.payload;
    }
  }

  const fetchedAt = new Date();
  try {
    await GitStatsCache.findOneAndUpdate(
      { team_id: teamId, round_id: roundId },
      { team_id: teamId, round_id: roundId, repo_url: repoUrl, status, payload, fetched_at: fetchedAt },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );
  } catch (err) {
    // Two teammates opening a cold cache in the same second can both pass
    // the find stage of the upsert and race on the unique
    // {team_id, round_id} index; the loser gets an E11000 duplicate-key
    // error. The data above was already fetched (and already cost quota) —
    // swallow the race instead of turning it into a 500 that discards it.
    if (err.code !== 11000) throw err;
  }

  return shape({ status, repo_url: repoUrl, payload, fetched_at: fetchedAt });
};
