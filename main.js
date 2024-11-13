import { Octokit } from "@octokit/rest";
import fs from "fs";
import fetch from "node-fetch";

const username = process.argv[2];
if (!username) {
    console.error("Please provide a GitHub username as the first argument.");
    process.exit(1);
}

const authToken = process.env.GITHUB_TOKEN || undefined;

const octokit = new Octokit({
    auth: authToken,
    request: { fetch }
});

async function getUserData(username) {
    try {
        const userData = await octokit.request('GET /users/{username}', {
            username: username
        });

        const repos = await octokit.paginate('GET /users/{username}/repos', {
            username: username,
            per_page: 100
        });

        let totalCommits = 0;
        const repoDetails = await Promise.all(repos.map(async repo => {
            const commits = await octokit.paginate('GET /repos/{owner}/{repo}/commits', {
                owner: username,
                repo: repo.name,
                per_page: 100
            });
            totalCommits += commits.length;
            return {
                name: repo.name,
                language: repo.language,
                description: repo.description,
                lastUpdated: repo.updated_at
            };
        }));

        const userStats = {
            username: userData.data.login,
            name: userData.data.name,
            bio: userData.data.bio,
            followers: userData.data.followers,
            following: userData.data.following,
            public_repos: userData.data.public_repos,
            totalCommits,
            repositories: repoDetails
        };

        fs.writeFileSync("user_data.json", JSON.stringify(userStats, null, 2));
        console.log("Data saved to user_data.json");
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

getUserData(username);
