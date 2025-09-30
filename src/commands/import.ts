import { convertIssueToTask, formatComment } from '../utils/converter';
import {validate} from '../config/config';

/**
 * Import issues from GitHub to YouTrack
 * @param options Command options
 */
export async function importIssues(options: { mappingFile?: string } = {}): Promise<void> {
  console.log('Starting import of GitHub issues to YouTrack...');

  // Validate configuration
  const { githubClient, youTrackClient, mappingFile, mappingStorage } = await validate(options);

  // Fetch issues from GitHub
  console.log('Fetching issues from GitHub...');
  const issues = await githubClient.getIssues();
  console.log(`Fetched ${issues.length} issues from GitHub.`);

  // Import issues to YouTrack
  console.log('Importing issues to YouTrack...');
  let importedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const issue of issues) {
    // Check if issue is already imported
    const existingMapping = mappingStorage.getMappingByGithubIssueId(issue.id);
    if (existingMapping) {
      console.log(`Skipping issue #${issue.number} (already imported as ${existingMapping.youtrackTaskIdReadable})`);
      skippedCount++;
      continue;
    }

    // Convert issue to YouTrack task
    const taskRequest = convertIssueToTask(issue);

    // Create task in YouTrack
    console.log(`Importing issue #${issue.id}: ${issue.title}`);
    const task = await youTrackClient.createTask(taskRequest);

    if (!task) {
      console.error(`Error importing issue #${issue.number}`);
      errorCount++;
      continue;
    }

    // Import comments if any
    if (issue.comments > 0) {
      console.log(`Fetching and importing ${issue.comments} comments for issue #${issue.number}`);
      const comments = await githubClient.getIssueComments(issue.number);

      for (const comment of comments) {
        const formattedComment = formatComment(comment);
        await youTrackClient.addComment(task.id, formattedComment);
      }
    }

    // Import labels if any
    if (issue.labels.length > 0) {
      console.log(`Fetching and importing ${issue.labels} labels for issue #${issue.number}`);

      for (const label of issue.labels) {
        await youTrackClient.addTag(task.id, label.name)
      }
    }

    // Save mapping
    mappingStorage.addOrUpdateMapping({
      githubIssueId: issue.id,
      githubIssueNumber: issue.number,
      youtrackTaskId: task.id,
      youtrackTaskIdReadable: task.idReadable,
      lastSyncedAt: new Date().toISOString()
    });

    importedCount++;
    console.log(`Successfully imported issue #${issue.number} as ${task.id}`);
  }

  // Print summary
  console.log('\nImport completed:');
  console.log(`- Imported: ${importedCount}`);
  console.log(`- Skipped (already imported): ${skippedCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Total: ${issues.length}`);
  console.log(`\nMapping file saved to: ${mappingFile}`);
}