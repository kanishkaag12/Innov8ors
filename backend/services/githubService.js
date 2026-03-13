const axios = require("axios");

async function getRepoCode(repoUrl) {

  try {

    const parts = repoUrl.replace("https://github.com/", "").split("/");

    const owner = parts[0];
    const repo = parts[1];

    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents`;

    const response = await axios.get(apiUrl);

    const files = response.data;

    let code = "";

    for (const file of files) {

      if (file.type === "file" && file.download_url) {

        if (
          file.name.endsWith(".js") ||
          file.name.endsWith(".java") ||
          file.name.endsWith(".ts")
        ) {

          const fileData = await axios.get(file.download_url);

          code += `\n\nFile: ${file.name}\n${fileData.data}`;
        }
      }
    }

    return code;

  } catch (error) {

    console.error("GitHub fetch error", error);

    return "";

  }

}

module.exports = { getRepoCode };