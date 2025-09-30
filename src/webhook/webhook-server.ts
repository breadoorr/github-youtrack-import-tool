import express from 'express';
import {Webhooks} from '@octokit/webhooks';
import {WEBHOOK_CONFIG} from '../config/config';
import {GitHubClient} from '../github/github-client';
import {YouTrackClient} from '../youtrack/youtrack-client';
import {MappingStorage} from '../models/mapping';
import path from 'path';

/**
 * WebhookServer class for handling GitHub webhook events
 */
export class WebhookServer {
  private app: express.Express;
  private webhooks: Webhooks;
  private githubClient: GitHubClient;
  private youtrackClient: YouTrackClient;
  private mappingStorage: MappingStorage;

  /**
   * Create a new WebhookServer instance
   * @param options Options for the webhook server
   */
  constructor(options: { mappingFile?: string } = {}) {
    this.app = express();

    // Initialize Octokit Webhooks
    this.webhooks = new Webhooks({
      secret: WEBHOOK_CONFIG.secret,
    });

    // Initialize clients
    this.githubClient = new GitHubClient();
    this.youtrackClient = new YouTrackClient();

    // Initialize mapping storage
    const mappingFile = options.mappingFile || path.resolve(process.cwd(), 'issue-task-mapping.json');
    this.mappingStorage = new MappingStorage(mappingFile);

    // Set up webhook event handlers
    this.setupWebhookHandlers();

    // Set up Express middleware
    this.setupMiddleware();
  }

  /**
   * Set up webhook event handlers
   */
  private setupWebhookHandlers(): void {
    // Handle issue events (created, edited, etc.)
    this.webhooks.on('issues', async ({ payload }) => {

      switch (payload.action) {
        case 'opened':
          await this.handleIssueCreated(payload.issue);
          break;
        case 'edited':
        case 'closed':
        case 'reopened':
        case 'labeled':
        case 'unlabeled':
        case 'assigned':
        case 'unassigned':
          await this.handleIssueUpdated(payload.issue);
          break;
        default:
          console.log(`Ignoring unsupported issue action: ${payload.action}`);
      }
    });

    // Handle issue comment events
    this.webhooks.on('issue_comment', async ({ name, payload }) => {
      console.log(`Received webhook event: ${name}.${payload.action}`);

      if (payload.action === 'created' || payload.action === 'edited') {
        await this.handleIssueCommentCreatedOrUpdated(payload.issue);
      }
    });
  }

  /**
   * Set up Express middleware
   */
  private setupMiddleware(): void {
    this.app.use(express.json());

    this.app.post(
        WEBHOOK_CONFIG.path,
        async (req, res) => {
          const signature = req.headers['x-hub-signature-256'] as string;

          try {
            await this.webhooks.verifyAndReceive({
              id: req.headers['x-github-delivery'] as string,
              name: req.headers['x-github-event'] as string,
              payload: JSON.stringify(req.body),
              signature: signature,
            });
            console.log('Webhook verified!');
            res.status(200).send('Webhook verified');
          } catch (error) {
            console.error('Webhook verification failed:', error);
            res.status(400).send('Invalid signature');
          }
        }
    );
  }

    /**
   * Start the webhook server
   */
  public async start() {
    const port = WEBHOOK_CONFIG.port;
    this.app.listen(port, () => {
      console.log(`Webhook server listening on port ${port}`);
      console.log(`Webhook endpoint: ${WEBHOOK_CONFIG.path}`);
    });
  }

  /**
   * Handle issue created event
   * @param issue The GitHub issue
   */
  private async handleIssueCreated(issue: any): Promise<void> {
    try {
      console.log(`Processing new issue #${issue.number}: ${issue.title}`);

      // Check if issue is already imported
      const existingMapping = this.mappingStorage.getMappingByGithubIssueId(issue.id);
      if (existingMapping) {
        console.log(`Issue #${issue.number} already imported as ${existingMapping.youtrackTaskIdReadable}`);
        return;
      }

      // Import the issue
      const fullIssue = await this.githubClient.getIssueByNumber(issue.number);
      if (!fullIssue) {
        console.error(`Error fetching full issue #${issue.number}`);
        return;
      }

      // Import issue to YouTrack
      const { importIssues } = await import('../commands/import');
      await importIssues({ mappingFile: this.mappingStorage['filePath'] });

      console.log(`Successfully processed new issue #${issue.number}`);
    } catch (error) {
      console.error(`Error handling issue created event for #${issue.number}:`, error);
    }
  }

  /**
   * Handle issue updated event
   * @param issue The GitHub issue
   */
  private async handleIssueUpdated(issue: any): Promise<void> {
    try {
      console.log(`Processing updated issue #${issue.number}: ${issue.title}`);

      // Check if issue is imported
      const mapping = this.mappingStorage.getMappingByGithubIssueId(issue.id);
      if (!mapping) {
        console.log(`Issue #${issue.number} not yet imported, importing now...`);
        await this.handleIssueCreated(issue);
        return;
      }

      // Sync the issue
      const { syncIssues } = await import('../commands/sync');
      await syncIssues({ mappingFile: this.mappingStorage['filePath'] });
    } catch (error) {
      console.error(`Error handling issue updated event for #${issue.id}:`, error);
    }
  }

  /**
   * Handle issue comment created or updated event
   * @param issue The GitHub issue
   */
  private async handleIssueCommentCreatedOrUpdated(issue: any): Promise<void> {
    try {
      console.log(`Processing comment on issue #${issue.number}`);

      // Check if issue is imported
      const mapping = this.mappingStorage.getMappingByGithubIssueId(issue.id);
      if (!mapping) {
        console.log(`Issue #${issue.number} not yet imported, ignoring comment`);
        return;
      }

      // Sync the issue to get the new comment
      const { syncIssues } = await import('../commands/sync');
      await syncIssues({ mappingFile: this.mappingStorage['filePath'] });

      console.log(`Successfully processed comment on issue #${issue.number}`);
    } catch (error) {
      console.error(`Error handling issue comment event for #${issue.number}:`, error);
    }
  }
}