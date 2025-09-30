# GitHub to YouTrack Import & Sync Tool

A command-line tool to import issues from GitHub repositories into YouTrack and keep them synchronized.

## Features

- Import GitHub issues into YouTrack as tasks
- Synchronize updates from GitHub to YouTrack
- Import and sync issue comments
- Preserve GitHub metadata (issue number, reporter, labels, etc.)
- Support for continuous synchronization
- Automatic synchronization via GitHub webhooks

## Prerequisites

- Node.js (v14 or later)
- GitHub personal access token with `Issues` scope
- YouTrack access token with appropriate permissions

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/breadoorr/github-youtrack-import-tool.git
   cd github-youtrack-import-tool
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Build the project:
   ```
   npm run build
   ```

4. Create a `.env` file in the project root with your configuration (see Configuration section below).

## Configuration

Create a `.env` file in the project root with the following variables:

```
# GitHub Configuration
GITHUB_TOKEN=your_github_token
GITHUB_OWNER=repository_owner
GITHUB_REPO=repository_name

# YouTrack Configuration
YOUTRACK_URL=https://your-instance.youtrack.cloud
YOUTRACK_TOKEN=your_youtrack_token
YOUTRACK_PROJECT_ID=your_project_id

# Webhook Configuration
WEBHOOK_PORT=3000  # Port for the webhook server
WEBHOOK_PATH=/webhook  # URL path for the webhook endpoint
WEBHOOK_SECRET=your_webhook_secret  # Secret for GitHub webhook signature validation
```

### GitHub Configuration

- `GITHUB_TOKEN`: A GitHub personal access token with the `Issues` scope
- `GITHUB_OWNER`: The owner of the GitHub repository (username or organization)
- `GITHUB_REPO`: The name of the GitHub repository

To create a GitHub personal access token:
1. Go to GitHub Settings > Developer settings > Personal access tokens
2. Click "Generate new token"
3. Select the `Issues` scope
4. Click "Generate token"

### YouTrack Configuration

- `YOUTRACK_URL`: The URL of your YouTrack instance (e.g., `https://your-instance.youtrack.cloud`)
- `YOUTRACK_TOKEN`: A YouTrack permanent token with appropriate permissions
- `YOUTRACK_PROJECT_NAME`: The name of the YouTrack project to import issues into

To create a YouTrack permanent token:
1. Go to YouTrack > Profile > Account Security
2. Click "New Token"
3. Enter a name for the token
4. Select the appropriate permissions (at minimum: Read/Write access to issues)
5. Click "Create"

### Webhook Configuration

- `WEBHOOK_PORT`: The port on which the webhook server will listen (default: 3000)
- `WEBHOOK_PATH`: The URL path for the webhook endpoint (default: /webhook)
- `WEBHOOK_SECRET`: A secret string used to validate GitHub webhook signatures (required for security)

## Usage

### Importing Issues

To import all issues from the configured GitHub repository to YouTrack:

```
npm run import
```

This will:
1. Fetch all issues from the GitHub repository
2. Convert them to YouTrack tasks
3. Import them into the configured YouTrack project
4. Save a mapping file (`issue-task-mapping.json`) to track the relationship between GitHub issues and YouTrack tasks

### Synchronizing Issues

To synchronize updates from GitHub to YouTrack:

```
npm run sync
```

This will:
1. Fetch recently updated issues from GitHub
2. Update the corresponding YouTrack tasks
3. Import any new comments

To run the synchronization continuously:

```
npm run webhook
```

This will:
1. Start a webhook server on the configured port
2. Listen for GitHub webhook events
3. Automatically import new issues and sync updates

#### Setting Up GitHub Webhooks

To configure GitHub to send webhook events to your server:

1. Expose your webhook server to the internet (using a service like ngrok, port forwarding, or hosting on a public server)
2. Go to your GitHub repository > Settings > Webhooks
3. Click "Add webhook"
4. Set the Payload URL to your webhook server URL (e.g., `https://your-server.example.com:3000/webhook`)
5. Set the Content type to `application/json`
6. Set the Secret to the same value as your `WEBHOOK_SECRET` environment variable
7. Under "Which events would you like to trigger this webhook?", select:
   - Issues
   - Issue comments
8. Ensure "Active" is checked
9. Click "Add webhook"

#### Security Considerations

When using webhooks, consider the following security best practices:

- Always use a strong, random webhook secret
- Use HTTPS for your webhook server
- Limit access to your webhook server using a firewall
- Regularly rotate your webhook secret
- Monitor webhook server logs for suspicious activity

### Command-Line Options

All commands support the following options:

- `-m, --mapping-file <path>`: Path to the mapping file (default: `issue-task-mapping.json` in the current directory)

## Example Output

### Import Command

```
Starting import of GitHub issues to YouTrack...
Validating API tokens...
API tokens validated successfully.
Fetching issues from octocat/Hello-World...
Fetched 42 issues from GitHub.
Importing issues to YouTrack...
Importing issue #1: First issue
Successfully imported issue #1 as PROJECT-1
Importing issue #2: Second issue
Fetching and importing 3 comments for issue #2
Successfully imported issue #2 as PROJECT-2
...

Import completed:
- Imported: 40
- Skipped (already imported): 0
- Errors: 2
- Total: 42

Mapping file saved to: /path/to/issue-task-mapping.json
```

### Sync Command

```
Starting synchronization of GitHub issues with YouTrack tasks...
Validating API tokens...
API tokens validated successfully.
Found 40 issue-task mappings.
Fetching issues updated since 2023-09-28 10:30:45...
Fetched 5 recently updated issues from GitHub.
Updating task PROJECT-2 from issue #2...
Syncing comments for issue #2...
Added new comment from GitHub issue #2
Successfully updated task PROJECT-2
...

Sync completed:
- Updated: 3
- Unchanged: 2
- Errors: 0
- Total processed: 5

Mapping file saved to: /path/to/issue-task-mapping.json
```

### Webhook Command

```
Starting webhook server for automatic synchronization...
Webhook server listening on port 3000
Webhook endpoint: /webhook
Webhook server started. Press Ctrl+C to stop.

Received webhook event: issues.opened
Processing new issue #10: New feature request
Fetched 1 issues from GitHub.
Importing issues to YouTrack...
Importing issue #10: New feature request
Successfully imported issue #10 as PROJECT-10
Import completed:
- Imported: 1
- Skipped (already imported): 0
- Errors: 0
- Total: 1
Successfully processed new issue #10

Received webhook event: issues.edited
Processing updated issue #5: Bug fix (updated)
Found 40 issue-task mappings.
Fetching issues updated since 2023-09-28 15:45:30...
Fetched 1 recently updated issues from GitHub.
Updating task PROJECT-5 from issue #5...
Successfully updated task PROJECT-5
Sync completed:
- Updated: 1
- Unchanged: 0
- Errors: 0
- Total processed: 1
Successfully processed updated issue #5
```

## Limitations

- The tool only supports one-way synchronization (GitHub to YouTrack)
- Custom fields in YouTrack must be configured manually
- Assignees and creators of the issues are not transferred along
- The tool does not handle attachments
- Webhook server requires public internet access or a tunneling service
- Webhook server does not support HTTPS out of the box (use a reverse proxy for production)