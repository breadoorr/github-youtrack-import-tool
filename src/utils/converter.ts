import { GitHubIssue, GitHubComment } from '../models/github';
import {YouTrackCustomField, YouTrackTaskCreationRequest, YouTrackTaskUpdateRequest} from '../models/youtrack';

/**
 * Convert a GitHub issue to a YouTrack task creation request
 * @param issue GitHub issue to convert
 * @returns YouTrack task creation request
 */
export function convertIssueToTask(issue: GitHubIssue): YouTrackTaskCreationRequest {
  const customFields: YouTrackCustomField[] = [

  ];

  const Issue = {
      $type: "Issue",
      project: { id: "", $type: "Project" },
      summary: issue.title,
      description: issue.body,
      customFields: customFields,
  }

  return <YouTrackTaskCreationRequest>Issue;
}

/**
 * Convert a GitHub issue to a YouTrack task update request
 * @param issue GitHub issue to convert
 * @returns YouTrack task update request
 */
export function convertIssueToTaskUpdate(issue: GitHubIssue): YouTrackTaskUpdateRequest {
  const description = formatDescription(issue);

  const customFields: YouTrackCustomField[] = [];

  const enhancedDescription = `${description}\n\nState: ${issue.state === 'closed' ? 'Resolved' : 'Open'}`;

  let labelsDescription = enhancedDescription;
  if (issue.labels && issue.labels.length > 0) {
    const labelNames = issue.labels.map(label => label.name).join(', ');
    labelsDescription = `${enhancedDescription}\nLabels: ${labelNames}`;
  }

  return {
    $type: "Issue",
    summary: issue.title,
    description: labelsDescription,
    customFields
  };
}

/**
 * Format a GitHub issue description for YouTrack
 * @param issue GitHub issue to format
 * @returns Formatted description
 */
function formatDescription(issue: GitHubIssue): string {
  let description = '';

  // Add original description
  if (issue.body) {
    description += issue.body;
  }

  // Add metadata section
  description += '\n\n---\n';
  description += `**GitHub Issue:** [#${issue.number}](${issue.html_url})\n`;
  description += `**Reporter:** [${issue.user.login}](${issue.user.html_url})\n`;
  description += `**Created:** ${new Date(issue.created_at).toLocaleString()}\n`;
  description += `**Updated:** ${new Date(issue.updated_at).toLocaleString()}\n`;

  if (issue.closed_at) {
    description += `**Closed:** ${new Date(issue.closed_at).toLocaleString()}\n`;
  }

  // Add labels
  if (issue.labels && issue.labels.length > 0) {
    description += '\n**Labels:** ';
    description += issue.labels.map(label => `\`${label.name}\``).join(', ');
    description += '\n';
  }

  // Add assignees
  if (issue.assignees && issue.assignees.length > 0) {
    description += '\n**Assignees:** ';
    description += issue.assignees.map(assignee => `[${assignee.login}](${assignee.html_url})`).join(', ');
    description += '\n';
  }

  return description;
}

/**
 * Format a GitHub comment for YouTrack
 * @param comment GitHub comment to format
 * @returns Formatted comment text
 */
export function formatComment(comment: GitHubComment): string {
  let text = '';

  // Add comment body
  text += comment.body;

  // Add metadata
  text += '\n\n---\n';
  text += `**GitHub Comment by:** [${comment.user.login}](${comment.user.html_url})\n`;
  text += `**Created:** ${new Date(comment.created_at).toLocaleString()}\n`;

  if (comment.updated_at !== comment.created_at) {
    text += `**Updated:** ${new Date(comment.updated_at).toLocaleString()}\n`;
  }

  return text;
}