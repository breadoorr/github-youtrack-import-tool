// Mapping between GitHub issues and YouTrack tasks
export interface IssueTaskMapping {
  githubIssueId: number;
  githubIssueNumber: number;
  youtrackTaskId: string;
  youtrackTaskIdReadable: string;
  lastSyncedAt: string; // ISO date string
}

// Storage for mappings
export class MappingStorage {
  private mappings: IssueTaskMapping[] = [];
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.loadMappings();
  }

  // Load mappings from file
  private loadMappings(): void {
    try {
      const fs = require('fs');
      if (fs.existsSync(this.filePath)) {
        const data = fs.readFileSync(this.filePath, 'utf8');
        this.mappings = JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
      this.mappings = [];
    }
  }

  // Save mappings to file
  private saveMappings(): void {
    try {
      const fs = require('fs');
      fs.writeFileSync(this.filePath, JSON.stringify(this.mappings, null, 2), 'utf8');
    } catch (error) {
      console.error('Error saving mappings:', error);
    }
  }

  // Add or update a mapping
  public addOrUpdateMapping(mapping: IssueTaskMapping): void {
    const existingIndex = this.mappings.findIndex(
      m => m.githubIssueId === mapping.githubIssueId
    );

    if (existingIndex >= 0) {
      this.mappings[existingIndex] = mapping;
    } else {
      this.mappings.push(mapping);
    }

    this.saveMappings();
  }

  // Get mapping by GitHub issue ID
  public getMappingByGithubIssueId(githubIssueId: number): IssueTaskMapping | undefined {
    return this.mappings.find(m => m.githubIssueId === githubIssueId);
  }

  // Get mapping by GitHub issue number
  public getMappingByGithubIssueNumber(githubIssueNumber: number): IssueTaskMapping | undefined {
    return this.mappings.find(m => m.githubIssueNumber === githubIssueNumber);
  }

  // Get mapping by YouTrack task ID
  public getMappingByYoutrackTaskId(youtrackTaskId: string): IssueTaskMapping | undefined {
    return this.mappings.find(m => m.youtrackTaskId === youtrackTaskId);
  }

  // Get all mappings
  public getAllMappings(): IssueTaskMapping[] {
    return [...this.mappings];
  }

  // Delete mapping by GitHub issue ID
  public deleteMappingByGithubIssueId(githubIssueId: number): boolean {
    const initialLength = this.mappings.length;
    this.mappings = this.mappings.filter(m => m.githubIssueId !== githubIssueId);
    
    if (initialLength !== this.mappings.length) {
      this.saveMappings();
      return true;
    }
    
    return false;
  }
}