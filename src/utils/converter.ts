import { GitHubIssue, GitHubComment } from '../models/github';
import {
  YouTrackCustomField,
  YouTrackTaskCreationRequest,
  YouTrackTaskUpdateRequest
} from '../models/youtrack';

/**
 * Convert a GitHub issue to a YouTrack task creation request
 * @param issue GitHub issue to convert
 * @returns YouTrack task creation request
 */
export function convertIssueToTask(issue: GitHubIssue): YouTrackTaskCreationRequest {
  const customFields: YouTrackCustomField[] = [
    {
      $type: "SingleEnumIssueCustomField",
      name: "Priority",
      value: {
        name: "Normal",
      },
    },
    {
      $type: "StateIssueCustomField",
      name: "State",
      value: {
        name: issue.state === 'closed' ? "Done" : "To do",
      },
    },
  ];

  return {
    $type: "Issue",
    project: { 
      id: "",
      $type: "Project" 
    },
    summary: issue.title,
    description: issue.body,
    customFields: customFields,
  };
}

/**
 * Convert a GitHub issue to a YouTrack task update request
 * @param issue GitHub issue to convert
 * @returns YouTrack task update request
 */
export function convertIssueToTaskUpdate(issue: GitHubIssue): YouTrackTaskUpdateRequest {
  const customFields: YouTrackCustomField[] = [
    {
      $type: "StateIssueCustomField",
      name: "State",
      value: {
        name: issue.state === 'closed' ? "Done" : "To do",
      },
    },
  ];

  return {
    $type: "Issue",
    summary: issue.title,
    description: issue.body as string,
    customFields: customFields,
  };
}

/**
 * Format a GitHub comment for YouTrack
 * @param comment GitHub comment to format
 * @returns Formatted comment text
 */
export function formatComment(comment: GitHubComment): string {
  let text = '';

  text += comment.body;

  text += '\n\n---\n';
  text += `**GitHub Comment by:** [${comment.user.login}](${comment.user.html_url})\n`;
  text += `**Created:** ${new Date(comment.created_at).toLocaleString()}\n`;

  if (comment.updated_at !== comment.created_at) {
    text += `**Updated:** ${new Date(comment.updated_at).toLocaleString()}\n`;
  }

  return text;
}