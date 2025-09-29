#!/usr/bin/env node

import { Command } from 'commander';
import { importIssues } from './commands/import';
import { syncIssues } from './commands/sync';
import { WebhookServer } from './webhook/webhook-server';
import path from 'path';

// Create CLI program
const program = new Command();
//
// program
//     .command('test')
//     .description('Test project')
//     .action(async () => {
//         try {
//             const client = new YouTrackClient();
//             await client.getProjectId();
//         }
//         catch (error) {
//         console.error(error);
//         }
//     });

// Set program metadata
program
  .name('github-youtrack-sync')
  .description('Import and synchronize GitHub issues with YouTrack tasks')
  .version('1.0.0');

// Import command
program
  .command('import')
  .description('Import GitHub issues to YouTrack')
  .option('-m, --mapping-file <path>', 'Path to the mapping file', path.resolve(process.cwd(), 'issue-task-mapping.json'))
  .action(async (options) => {
    try {
      await importIssues({
        mappingFile: options.mappingFile
      });
    } catch (error) {
      console.error('Error during import:', error);
      process.exit(1);
    }
  });

// Sync command
program
  .command('sync')
  .description('Synchronize GitHub issues with YouTrack tasks')
  .option('-m, --mapping-file <path>', 'Path to the mapping file', path.resolve(process.cwd(), 'issue-task-mapping.json'))
  .option('-c, --continuous', 'Run in continuous mode, checking for updates periodically')
  .action(async (options) => {
    try {
      await syncIssues({
        mappingFile: options.mappingFile,
        continuous: options.continuous
      });
    } catch (error) {
      console.error('Error during sync:', error);
      process.exit(1);
    }
  });

// Webhook command
program
  .command('webhook')
  .description('Start webhook server to automatically sync GitHub issues')
  .option('-m, --mapping-file <path>', 'Path to the mapping file', path.resolve(process.cwd(), 'issue-task-mapping.json'))
  .action(async (options) => {
    try {
      console.log('Starting webhook server for automatic synchronization...');

      // Create webhook server
      const webhookServer = new WebhookServer({
        mappingFile: options.mappingFile
      });

      // Start the server
      webhookServer.start();

      console.log('Webhook server started. Press Ctrl+C to stop.');
    } catch (error) {
      console.error('Error starting webhook server:', error);
      process.exit(1);
    }
  });

// Default command (if no command is specified)
program
  .action(() => {
    console.log('Please specify a command: import, sync, or webhook');
    console.log('For help, use --help');
    program.help();
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments provided, show help
if (process.argv.length <= 2) {
  program.help();
}