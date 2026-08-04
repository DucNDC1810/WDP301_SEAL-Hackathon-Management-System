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

const isFresh = (entry) => {
  if (!entry) return false;
  const age = Date.now() - new Date(entry.fetched_at).getTime();
  return age < (entry.status === "ok" ? TTL_MS : ERROR_TTL_MS);
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
  }

  await GitStatsCache.findOneAndUpdate(
    { team_id: teamId, round_id: roundId },
    { team_id: teamId, round_id: roundId, repo_url: repoUrl, status, payload, fetched_at: new Date() },
    { upsert: true }
  );

  return shape({ status, repo_url: repoUrl, payload, fetched_at: new Date() });
};
