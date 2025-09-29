import dotenv from 'dotenv';
import path from 'path';
import {GitHubClient} from "../github/github-client";
import {YouTrackClient} from "../youtrack/youtrack-client";
import {MappingStorage} from "../models/mapping";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// GitHub configuration
export const GITHUB_CONFIG = {
  token: process.env.GITHUB_TOKEN || '',
  owner: process.env.GITHUB_OWNER || '',
  repo: process.env.GITHUB_REPO || '',
};

// YouTrack configuration
export const YOUTRACK_CONFIG = {
  url: process.env.YOUTRACK_URL || '',
  token: process.env.YOUTRACK_TOKEN || '',
  projectName: process.env.YOUTRACK_PROJECT_NAME || '',
};

// Synchronization configuration
export const SYNC_CONFIG = {
  intervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '60', 10),
};

// Webhook configuration
export const WEBHOOK_CONFIG = {
  port: parseInt(process.env.WEBHOOK_PORT || '3000', 10),
  path: process.env.WEBHOOK_PATH || '/webhook',
  secret: process.env.WEBHOOK_SECRET || '',
};

// Validate configuration
function validateConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate GitHub configuration
  if (!GITHUB_CONFIG.token) errors.push('GITHUB_TOKEN is required');
  if (!GITHUB_CONFIG.owner) errors.push('GITHUB_OWNER is required');
  if (!GITHUB_CONFIG.repo) errors.push('GITHUB_REPO is required');

  // Validate YouTrack configuration
  if (!YOUTRACK_CONFIG.url) errors.push('YOUTRACK_URL is required');
  if (!YOUTRACK_CONFIG.token) errors.push('YOUTRACK_TOKEN is required');
  if (!YOUTRACK_CONFIG.projectName) errors.push('YOUTRACK_PROJECT_ID is required');

  // Validate sync configuration
  if (isNaN(SYNC_CONFIG.intervalMinutes) || SYNC_CONFIG.intervalMinutes <= 0) {
    errors.push('SYNC_INTERVAL_MINUTES must be a positive number');
  }
  
  // Validate webhook configuration
  if (isNaN(WEBHOOK_CONFIG.port) || WEBHOOK_CONFIG.port <= 0) {
    errors.push('WEBHOOK_PORT must be a positive number');
  }
  if (!WEBHOOK_CONFIG.secret) {
    errors.push('WEBHOOK_SECRET is required for secure webhook operation');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function validate(options: { mappingFile?: string, continuous?: boolean }): Promise<{
  githubClient: GitHubClient;
  youTrackClient: YouTrackClient;
  mappingFile: string;
  mappingStorage: MappingStorage;
}> {
  const configValidation = validateConfig();
  if (!configValidation.valid) {
    console.error('Invalid configuration:');
    configValidation.errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  // Initialize clients
  const githubClient = new GitHubClient();
  const youTrackClient = new YouTrackClient();

  // Initialize mapping storage
  const mappingFile = options.mappingFile || path.resolve(process.cwd(), 'issue-task-mapping.json');
  const mappingStorage = new MappingStorage(mappingFile);

  // Validate API tokens
  console.log('Validating API tokens...');
  const githubTokenValid = await githubClient.validateToken();
  const youtrackTokenValid = await youTrackClient.validateToken();

  if (!githubTokenValid) {
    console.error('GitHub token is invalid. Please check your configuration.');
    process.exit(1);
  }

  if (!youtrackTokenValid) {
    console.error('YouTrack token is invalid. Please check your configuration.');
    process.exit(1);
  }

  console.log('API tokens validated successfully.');

  return {
    githubClient,
    youTrackClient,
    mappingFile,
    mappingStorage,
  }
}