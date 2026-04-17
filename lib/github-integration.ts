/**
 * GitHub Integration
 * Handles OAuth and repository creation
 */

import { Octokit } from '@octokit/rest';

export interface GitHubConfig {
  accessToken: string;
  username: string;
}

export interface GitHubRepository {
  name: string;
  fullName: string;
  url: string;
  cloneUrl: string;
}

/**
 * Create a new GitHub repository and push files
 */
export async function createGitHubRepository(
  config: GitHubConfig,
  repoName: string,
  description: string,
  files: { [path: string]: string },
  isPrivate: boolean = false
): Promise<GitHubRepository> {
  const octokit = new Octokit({
    auth: config.accessToken,
  });

  try {
    // Create repository
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: isPrivate,
      auto_init: false,
    });

    // Get default branch
    const defaultBranch = repo.default_branch || 'main';

    // Prepare files for commit
    const fileEntries = Object.entries(files);
    
    // Create tree with all files
    const tree = fileEntries.map(([path, content]) => ({
      path,
      mode: '100644' as const,
      type: 'blob' as const,
      content,
    }));

    // For empty repo (auto_init: false), we need initial commit with no parents
    let commitSha: string;
    try {
      const { data: ref } = await octokit.git.getRef({
        owner: config.username,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
      });
      const { data: treeData } = await octokit.git.createTree({
        owner: config.username,
        repo: repoName,
        tree: tree as any,
        base_tree: ref.object.sha,
      });
      const { data: commit } = await octokit.git.createCommit({
        owner: config.username,
        repo: repoName,
        message: 'Initial commit from Draftly',
        tree: treeData.sha,
        parents: [ref.object.sha],
      });
      commitSha = commit.sha;
      await octokit.git.updateRef({
        owner: config.username,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
        sha: commit.sha,
      });
    } catch (refErr: any) {
      // Empty repo: no ref exists, create initial commit
      const { data: treeData } = await octokit.git.createTree({
        owner: config.username,
        repo: repoName,
        tree: tree as any,
      });
      const { data: commit } = await octokit.git.createCommit({
        owner: config.username,
        repo: repoName,
        message: 'Initial commit from Draftly',
        tree: treeData.sha,
        parents: [],
      });
      commitSha = commit.sha;
      await octokit.git.createRef({
        owner: config.username,
        repo: repoName,
        ref: `refs/heads/${defaultBranch}`,
        sha: commit.sha,
      });
    }

    return {
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      cloneUrl: repo.clone_url,
    };
  } catch (error: any) {
    console.error('GitHub repository creation error:', error);
    throw new Error(`Failed to create GitHub repository: ${error.message}`);
  }
}

/**
 * Get GitHub OAuth URL
 */
export function getGitHubOAuthURL(clientId: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'repo',
    state,
  });
  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeGitHubCode(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const data = await response.json();
  
  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

