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
  ".py",
  ".go",
  ".rb",
  ".php",
  ".sql",
  ".yml",
  ".yaml",
  ".env.example",
  "dockerfile",
  "package.json"
];

const MAX_SELECTED_FILES = 5;
const MAX_FILE_CHARS = 8000;
const MAX_TOTAL_CHARS = 12000;

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "this", "that", "from", "into", "your", "have", "will", "would",
  "should", "could", "project", "description", "deliverable", "milestone", "requirement",
  "build", "create", "using", "flow", "application", "development", "full", "stack", "simple"
]);

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

async function collectRepoFiles(apiUrl, headers, repoFiles, visitedUrls = new Set(), summary = { count: 0 }) {
  if (visitedUrls.has(apiUrl)) {
    return;
  }

  visitedUrls.add(apiUrl);

  let response;
  try {
    response = await axios.get(apiUrl, { headers });
  } catch (error) {
    const statusCode = error?.response?.status;
    if (statusCode === 404) {
      throw new Error("GitHub repository not found. Please check the repo URL and visibility settings.");
    }
    throw new Error(`Failed to fetch repository contents: ${error.message}`);
  }

  const files = Array.isArray(response.data) ? response.data : [];

  for (const file of files) {
    if (file.type === "dir" && file.url) {
      await collectRepoFiles(file.url, headers, repoFiles, visitedUrls, summary);
      continue;
    }

    if (file.type === "file" && file.download_url && isCodeFile(file.name)) {
      summary.count++;
      repoFiles.push({
        name: file.name,
        path: file.path,
        download_url: file.download_url
      });
    }
  }

  return summary.count;
}

function extractKeywords(text = "") {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word && word.length > 2 && !STOP_WORDS.has(word));
}

function scoreFile(file, milestoneKeywords = [], projectKeywords = []) {
  const haystack = `${file.path} ${file.name}`.toLowerCase();
  let score = 0;

  // 1. Primary Priority: Project Title Alignment (e.g. 'tic-tac-toe')
  for (const keyword of projectKeywords) {
    if (haystack.includes(keyword)) {
      score += 10;
    }
  }

  // 2. Secondary Priority: Milestone Requirements
  for (const keyword of milestoneKeywords) {
    if (haystack.includes(keyword)) {
      score += 8;
    }
  }

  // 3. Technical Entities
  if (haystack.includes("razorpay")) score += 12; // High priority for reported recognition issue
  if (haystack.includes("stripe") || haystack.includes("paypal")) score += 10;
  if (haystack.includes("checkout")) score += 9;
  if (haystack.includes("payment")) score += 8;
  if (haystack.includes("escrow")) score += 8;
  if (haystack.includes("payout")) score += 8;
  if (haystack.includes("auth")) score += 7;
  if (haystack.includes("verify")) score += 7;
  if (haystack.includes("quality")) score += 7;
  if (haystack.includes("milestone")) score += 6;
  
  // 4. Structural Weights
  if (haystack.includes("readme")) score += 6;
  if (haystack.includes("package.json")) score += 6;
  if (haystack.includes("server") || haystack.includes("app.js")) score += 5;
  if (haystack.includes("route") || haystack.includes("controller")) score += 5;
  if (haystack.includes("service") || haystack.includes("model")) score += 5;
  if (haystack.includes("frontend/src/app/dashboard")) score += 4;
  if (haystack.includes("api/")) score += 3;
  if (haystack.includes(".env.example")) score += 4;

  return score;
}

function trimFileContent(content = "") {
  const text = String(content || "");
  if (text.length <= MAX_FILE_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_FILE_CHARS)}\n/* truncated for verification */`;
}

async function getRepoCode(repoUrl, milestoneText = "", projectTitle = "") {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const headers = {
    Accept: "application/vnd.github+json"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;
  const milestoneKeywords = extractKeywords(milestoneText);
  const projectKeywords = extractKeywords(projectTitle);
  
  const repoFiles = [];
  const scanSummary = { count: 0 };
  await collectRepoFiles(apiUrl, headers, repoFiles, new Set(), scanSummary);

  console.log(`[GITHUB] Scanned ${scanSummary.count} files in repository ${owner}/${repo}`);

  if (!repoFiles.length) {
    throw new Error("Repository contains no supported code files for milestone verification.");
  }

  const rankedFiles = repoFiles
    .map((file) => ({
      ...file,
      score: scoreFile(file, milestoneKeywords, projectKeywords)
    }))
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, MAX_SELECTED_FILES);

  const repoCodeParts = [];
  let totalChars = 0;
  const fileListSummary = rankedFiles.map((file) => `- ${file.path} (score ${file.score})`).join("\n");

  repoCodeParts.push(`Project Title: ${projectTitle}\nRepository: ${owner}/${repo}\nSelected relevant files:\n${fileListSummary}`);

  for (const file of rankedFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      break;
    }

    const fileData = await axios.get(file.download_url, { headers });
    const trimmed = trimFileContent(fileData.data);
    const remaining = MAX_TOTAL_CHARS - totalChars;
    const finalSnippet =
      trimmed.length > remaining ? `${trimmed.slice(0, remaining)}\n/* total payload truncated */` : trimmed;

    repoCodeParts.push(`\n\nFile: ${file.path}\n${finalSnippet}`);
    totalChars += finalSnippet.length;
  }

  return {
    code: repoCodeParts.join(""),
    filesScanned: scanSummary.count,
    filesAnalyzed: rankedFiles.length
  };
}

module.exports = { getRepoCode };
