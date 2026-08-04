// Pure identity matching between GitHub contributors and team members.
// Kept free of I/O so the matching rules can be tested without the network.

/**
 * Two-tier match, most reliable first:
 *   1. GitHub numeric id against User.provider_id (only set when the student
 *      signed in with GitHub). Usernames can be renamed; numeric ids cannot.
 *   2. Self-declared User.github_username, compared case-insensitively.
 *
 * A member is never claimed by two contributors — the first (highest-commit,
 * since the caller passes them pre-sorted) wins.
 */
export const matchContributorsToMembers = (contributors, members) => {
  const list = Array.isArray(contributors) ? contributors : [];
  const people = Array.isArray(members) ? members : [];

  const byId = new Map();
  const byUsername = new Map();
  for (const m of people) {
    const u = m.user ?? {};
    if (u.provider === "github" && u.provider_id) {
      byId.set(String(u.provider_id), m.email);
    }
    if (u.github_username) {
      byUsername.set(String(u.github_username).toLowerCase(), m.email);
    }
  }

  const claimed = new Set();
  const rows = list.map((c) => {
    const idKey = c.github_id === null || c.github_id === undefined ? null : String(c.github_id);
    const nameKey = c.username ? String(c.username).toLowerCase() : null;

    let email = null;
    if (idKey && byId.has(idKey) && !claimed.has(byId.get(idKey))) {
      email = byId.get(idKey);
    } else if (nameKey && byUsername.has(nameKey) && !claimed.has(byUsername.get(nameKey))) {
      email = byUsername.get(nameKey);
    }
    if (email) claimed.add(email);

    return {
      github_id: c.github_id ?? null,
      username: c.username ?? "Unknown",
      avatar_url: c.avatar_url ?? null,
      profile_url: c.profile_url ?? null,
      commit_count: c.commit_count ?? 0,
      matched_member_email: email,
    };
  });

  return {
    rows,
    unmatched: rows.filter((r) => r.matched_member_email === null),
    membersWithoutActivity: people.map((m) => m.email).filter((e) => !claimed.has(e)),
  };
};
