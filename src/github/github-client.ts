import { Octokit } from '@octokit/rest';
import { GITHUB_CONFIG } from '../config/config';
import { GitHubIssue, GitHubComment } from '../models/github';

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;

  constructor() {
    this.octokit = new Octokit({
      auth: GITHUB_CONFIG.token,
    });
    this.owner = GITHUB_CONFIG.owner;
    this.repo = GITHUB_CONFIG.repo;
  }

  /**
   * Fetch all issues from the repository
   * @param since Optional date to fetch issues updated since
   * @returns Array of GitHub issues
   */
  public async getIssues(since?: string): Promise<GitHubIssue[]> {
    console.log(`Fetching issues from ${this.owner}/${this.repo}${since ? ` since ${since}` : ''}`);
    
    const issues: GitHubIssue[] = [];
    let page = 1;
    let hasMorePages = true;
    
    while (hasMorePages) {
      try {
        const response = await this.octokit.issues.listForRepo({
          owner: this.owner,
          repo: this.repo,
          state: 'all',
          per_page: 100,
          page,
          since,
        });
        
        // Filter out pull requests (they are also returned by the issues API)
        const filteredIssues = response.data.filter(issue => !('pull_request' in issue)) as unknown as GitHubIssue[];
        issues.push(...filteredIssues);

        hasMorePages = response.data.length === 100;
        page++;
      } catch (error) {
        console.error('Error fetching GitHub issues:', error);
        hasMorePages = false;
      }
    }
    
    console.log(`Fetched ${issues.length} issues from GitHub`);
    return issues;
  }

  /**
   * Fetch a single issue by its number
   * @param issueNumber The issue number
   * @returns The GitHub issue or null if not found
   */
  public async getIssueByNumber(issueNumber: number): Promise<GitHubIssue | null> {
    try {
      const response = await this.octokit.issues.get({
        owner: this.owner,
        repo: this.repo,
        issue_number: issueNumber,
      });
      
      // Check if it's a pull request
      if ('pull_request' in response.data) {
        return null;
      }
      
      return response.data as unknown as GitHubIssue;
    } catch (error) {
      console.error(`Error fetching GitHub issue #${issueNumber}:`, error);
      return null;
    }
  }

  /**
   * Fetch comments for an issue
   * @param issueNumber The issue number
   * @returns Array of GitHub comments
   */
  public async getIssueComments(issueNumber: number): Promise<GitHubComment[]> {
    try {
      const comments: GitHubComment[] = [];
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const response = await this.octokit.issues.listComments({
          owner: this.owner,
          repo: this.repo,
          issue_number: issueNumber,
          per_page: 100,
          page,
        });
        
        comments.push(...response.data as GitHubComment[]);
        
        // Check if there are more pages
        hasMorePages = response.data.length === 100;
        page++;
      }
      
      return comments;
    } catch (error) {
      console.error(`Error fetching comments for GitHub issue #${issueNumber}:`, error);
      return [];
    }
  }

  /**
   * Check if the GitHub token is valid
   * @returns True if the token is valid, false otherwise
   */
  public async validateToken(): Promise<boolean> {
    try {
      await this.octokit.users.getAuthenticated();
      return true;
    } catch (error) {
      console.error('Error validating GitHub token:', error);
      return false;
    }
  }
}