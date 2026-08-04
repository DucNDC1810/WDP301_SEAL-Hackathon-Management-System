// Đếm số commit của 1 repo GitHub công khai qua REST API, không cần token
// (giới hạn 60 request/giờ/IP — đủ dùng cho nhu cầu admin xem thủ công).

const GITHUB_API = "https://api.github.com";

/**
 * Trích owner/repo từ URL GitHub (chấp nhận có/không .git, có/không trailing slash).
 * @returns {{ owner: string, repo: string } | null}
 */
export const parseGithubRepoUrl = (url) => {
  if (!url) return null;
  const match = url.trim().match(/github\.com\/([^/]+)\/([^/#?]+?)(\.git)?\/?(?:[#?].*)?$/i);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
};

/**
 * Đếm tổng số commit của nhánh mặc định bằng cách đọc header phân trang `Link`
 * của GitHub API (per_page=1 → trang cuối cùng chính là tổng số commit),
 * tránh phải tải toàn bộ danh sách commit.
 */
export const getCommitCount = async (repoUrl) => {
  const parsed = parseGithubRepoUrl(repoUrl);
  if (!parsed) {
    const err = new Error("Link không phải repository GitHub hợp lệ");
    err.statusCode = 400;
    throw err;
  }
  const { owner, repo } = parsed;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=1`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (res.status === 404) {
    const err = new Error("Không tìm thấy repository (private hoặc không tồn tại)");
    err.statusCode = 404;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error("GitHub API đã đạt giới hạn truy vấn (rate limit), vui lòng thử lại sau");
    err.statusCode = 429;
    throw err;
  }
  if (res.status === 409) {
    // Repo rỗng, chưa có commit nào
    return { owner, repo, commit_count: 0 };
  }
  if (!res.ok) {
    const err = new Error(`GitHub API trả lỗi: ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  const linkHeader = res.headers.get("link");
  let commitCount;
  if (linkHeader) {
    const lastMatch = linkHeader.match(/[?&]page=(\d+)[^>]*>;\s*rel="last"/);
    commitCount = lastMatch ? parseInt(lastMatch[1], 10) : null;
  }
  if (commitCount == null) {
    // Không có header Link nghĩa là chỉ có 1 trang (0 hoặc 1 commit)
    const body = await res.json();
    commitCount = Array.isArray(body) ? body.length : 0;
  }

  return { owner, repo, commit_count: commitCount };
};

/**
 * Lấy danh sách contributor kèm số commit của từng người, dùng endpoint
 * GitHub /contributors (đã tổng hợp sẵn, không cần tự đếm qua từng commit).
 * Lưu ý: GitHub tính theo tác giả commit (author), không phân biệt theo nhánh,
 * và có thể không khớp 100% với tổng commit_count nếu có merge commit trùng tác giả
 * trên nhiều nhánh — con số này mang tính tham khảo mức độ đóng góp.
 */
export const getContributorStats = async (repoUrl) => {
  const parsed = parseGithubRepoUrl(repoUrl);
  if (!parsed) {
    const err = new Error("Link không phải repository GitHub hợp lệ");
    err.statusCode = 400;
    throw err;
  }
  const { owner, repo } = parsed;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contributors?per_page=100&anon=1`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (res.status === 404) {
    const err = new Error("Không tìm thấy repository (private hoặc không tồn tại)");
    err.statusCode = 404;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error("GitHub API đã đạt giới hạn truy vấn (rate limit), vui lòng thử lại sau");
    err.statusCode = 429;
    throw err;
  }
  if (res.status === 204) {
    // Repo rỗng, chưa có contributor nào
    return { owner, repo, contributors: [] };
  }
  if (!res.ok) {
    const err = new Error(`GitHub API trả lỗi: ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  const body = await res.json();
  const contributors = (Array.isArray(body) ? body : [])
    .map((c) => ({
      username: c.login || c.name || "Unknown",
      avatar_url: c.avatar_url || null,
      profile_url: c.html_url || null,
      commit_count: c.contributions || 0,
    }))
    .sort((a, b) => b.commit_count - a.commit_count);

  return { owner, repo, contributors };
};

/**
 * Lấy danh sách commit gần nhất (message, tác giả, thời gian, link) của nhánh mặc định.
 */
export const getRecentCommits = async (repoUrl, limit = 30) => {
  const parsed = parseGithubRepoUrl(repoUrl);
  if (!parsed) {
    const err = new Error("Link không phải repository GitHub hợp lệ");
    err.statusCode = 400;
    throw err;
  }
  const { owner, repo } = parsed;

  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits?per_page=${limit}`, {
    headers: { Accept: "application/vnd.github+json" },
  });

  if (res.status === 404) {
    const err = new Error("Không tìm thấy repository (private hoặc không tồn tại)");
    err.statusCode = 404;
    throw err;
  }
  if (res.status === 403) {
    const err = new Error("GitHub API đã đạt giới hạn truy vấn (rate limit), vui lòng thử lại sau");
    err.statusCode = 429;
    throw err;
  }
  if (res.status === 409) {
    // Repo rỗng, chưa có commit nào
    return { owner, repo, commits: [] };
  }
  if (!res.ok) {
    const err = new Error(`GitHub API trả lỗi: ${res.status}`);
    err.statusCode = 502;
    throw err;
  }

  const body = await res.json();
  const commits = (Array.isArray(body) ? body : []).map((c) => ({
    sha: c.sha?.slice(0, 7) || "",
    message: (c.commit?.message || "").split("\n")[0], // chỉ lấy dòng đầu tiên
    author_name: c.commit?.author?.name || c.author?.login || "Unknown",
    author_username: c.author?.login || null,
    author_avatar: c.author?.avatar_url || null,
    committed_at: c.commit?.author?.date || null,
    url: c.html_url || null,
  }));

  return { owner, repo, commits };
};
