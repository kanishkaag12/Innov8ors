const axios = require("axios");

const CODE_EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".json",
  ".md",
  ".css",
  ".scss",
  ".html",
  ".java",
  ".py"
];

function isCodeFile(filename = "") {
  const lower = filename.toLowerCase();
  return CODE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function parseRepoUrl(repoUrl) {
  const normalized = String(repoUrl || "").replace(/\/+$/, "");
  const match = normalized.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+)(?:\/.*)?$/i);

  if (!match) {
    throw new Error("Invalid GitHub repository URL");
  }

  return {
    owner: match[1],
    repo: match[2]
  };
}

async function fetchRepoContents(apiUrl, headers, repoCodeParts, visitedUrls = new Set()) {
  if (visitedUrls.has(apiUrl)) {
    return;
  }

  visitedUrls.add(apiUrl);

  const response = await axios.get(apiUrl, { headers });
  const files = Array.isArray(response.data) ? response.data : [];

  for (const file of files) {
    if (file.type === "dir" && file.url) {
      await fetchRepoContents(file.url, headers, repoCodeParts, visitedUrls);
      continue;
    }

    if (file.type === "file" && file.download_url && isCodeFile(file.name)) {
      const fileData = await axios.get(file.download_url, { headers });
      repoCodeParts.push(`\n\nFile: ${file.path}\n${fileData.data}`);
    }
  }
}

async function getRepoCode(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const headers = {
    Accept: "application/vnd.github+json"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const repoCodeParts = [];
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

  await fetchRepoContents(apiUrl, headers, repoCodeParts);

  return repoCodeParts.join("");
}

module.exports = { getRepoCode };
