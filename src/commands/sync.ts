import { GitHubClient } from '../github/github-client';
import { YouTrackClient } from '../youtrack/youtrack-client';
import {convertIssueToTask, convertIssueToTaskUpdate, formatComment} from '../utils/converter';
import { IssueTaskMapping } from '../models/mapping';
import {validate} from '../config/config';
import {GitHubIssue} from "../models/github";

/**
 * Synchronize GitHub issues with YouTrack tasks
 * @param options Command options
 */
export async function syncIssues(options: { mappingFile?: string, continuous?: boolean } = {}): Promise<void> {
  console.log('Starting synchronization of GitHub issues with YouTrack tasks...');

  // Validate configuration
  const {githubClient, youTrackClient, mappingFile, mappingStorage} = await validate(options);

  const mappings = mappingStorage.getAllMappings();
  if (mappings.length === 0) {
    console.error('No mappings found. Please run the import command first.');
    process.exit(1);
  }

  console.log(`Found ${mappings.length} issue-task mappings.`);

  // Function to perform a single sync
  const performSync = async () => {
    let updatedCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;

    // Get the earliest last sync time
    const earliestSyncTime = mappings.reduce((earliest, mapping) => {
      const mappingTime = new Date(mapping.lastSyncedAt).getTime();
      return mappingTime < earliest ? mappingTime : earliest;
    }, Date.now());

    // Format as ISO string for GitHub API
    const sinceDate = new Date(earliestSyncTime).toISOString();

    // Fetch recently updated issues from GitHub
    console.log(`Fetching issues updated since ${new Date(earliestSyncTime).toLocaleString()}...`);
    const updatedIssues = await githubClient.getIssues(sinceDate);
    console.log(`Fetched ${updatedIssues.length} recently updated issues from GitHub.`);

    // Process each updated issue
    for (const issue of updatedIssues) {
      const mapping = mappingStorage.getMappingByGithubIssueId(issue.id);
      if (!mapping) {
        console.log(`Issue #${issue.number} is new and not yet imported. Skipping.`);
        continue;
      }

      // Check if the issue was updated after our last sync
      const issueUpdatedAt = new Date(issue.updated_at).getTime();
      const lastSyncedAt = new Date(mapping.lastSyncedAt).getTime();

      if (issueUpdatedAt <= lastSyncedAt) {
        console.log(`Issue #${issue.number} has not been updated since last sync. Skipping.`);
        unchangedCount++;
        continue;
      }

      try {
        const taskUpdate = convertIssueToTaskUpdate(issue);

        const updateSuccess = await youTrackClient.updateTask(mapping.youtrackTaskId, taskUpdate);

        if (!updateSuccess) {
          try {
            const createTask = await youTrackClient.createTask(convertIssueToTask(issue));
            if (!createTask) {
              errorCount++;
              continue;
            } else {
              mapping.youtrackTaskId = createTask?.id
            }
          } catch (error) {
            console.error(`Error updating task ${mapping.youtrackTaskIdReadable}`);
          }
        }

        // Sync comments if needed
        await syncComments(githubClient, youTrackClient, issue.number, mapping);

        // Sync labels if needed
        await syncLabels(youTrackClient, issue, mapping.youtrackTaskId);

        // Update last synced time
        mappingStorage.addOrUpdateMapping({
          ...mapping,
          lastSyncedAt: new Date().toISOString()
        });

        updatedCount++;
        console.log(`Successfully updated task ${mapping.youtrackTaskId}`);
      } catch (error) {
        console.error(`Error syncing issue #${issue.number}:`, error);
        errorCount++;
      }
    }

    // Print summary
    console.log('\nSync completed:');
    console.log(`- Updated: ${updatedCount}`);
    console.log(`- Unchanged: ${unchangedCount}`);
    console.log(`- Errors: ${errorCount}`);
    console.log(`- Total processed: ${updatedIssues.length}`);
    console.log(`\nMapping file saved to: ${mappingFile}`);

    return {updatedCount, errorCount, unchangedCount};
  };

  await performSync();
}

/**
 * Synchronize comments for an issue
 * @param githubClient GitHub client
 * @param youtrackClient YouTrack client
 * @param issueNumber GitHub issue number
 * @param mapping Issue-task mapping
 */
async function syncComments(
  githubClient: GitHubClient,
  youtrackClient: YouTrackClient,
  issueNumber: number,
  mapping: IssueTaskMapping
): Promise<void> {
  // Get the task to check existing comments
  const task = await youtrackClient.getTaskById(mapping.youtrackTaskId);
  if (!task) {
    console.error(`Error fetching task ${mapping.youtrackTaskIdReadable}`);
    return;
  }

  // Get comments from GitHub
  const githubComments = await githubClient.getIssueComments(issueNumber);
  if (githubComments.length === 0) {
    return;
  }

  // fetch all GitHub comments and add the new ones
  if (!task.comments || task.comments.length < githubComments.length) {
    console.log(`Syncing comments for issue #${issueNumber}...`);

    // Get existing comment IDs from task description
    const existingCommentIds = new Set<number>();
    const commentIdRegex = /GitHub Comment ID: (\d+)/g;
    let match;

    task.comments.forEach(comment => {
      while ((match = commentIdRegex.exec(comment.text)) !== null) {
        existingCommentIds.add(parseInt(match[1], 10));
      }
    });

    // Add new comments
    for (const comment of githubComments) {
      if (!existingCommentIds.has(comment.id)) {
        const formattedComment = formatComment(comment) + `\n\nGitHub Comment ID: ${comment.id}`;
        await youtrackClient.addComment(mapping.youtrackTaskId, formattedComment);
        console.log(`Added new comment from GitHub issue #${issueNumber}`);
      }
    }
  }
}

/**
 * Synchronise labels for an issue
 * @param youTrackClient YouTrack client
 * @param issue Github issue
 * @param youtrackTaskId id of task in YouTrack
 */
async function syncLabels(youTrackClient: YouTrackClient, issue: GitHubIssue, youtrackTaskId: string): Promise<void> {
  // Sync labels if any
  if (issue.labels.length > 0) {
    console.log(`Fetching and importing ${issue.labels} labels for issue #${issue.number}`);

    for (const label of issue.labels) {
      await youTrackClient.addTag(youtrackTaskId, label.name)
    }
  }
}