import axios, { AxiosInstance } from 'axios';
import { YOUTRACK_CONFIG } from '../config/config';
import { 
  YouTrackTask, 
  YouTrackTaskCreationRequest, 
  YouTrackTaskUpdateRequest,
  YouTrackComment
} from '../models/youtrack';

export class YouTrackClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;
  private projectName: string;
  private projectId: string | null = null;

  constructor() {
    this.baseUrl = YOUTRACK_CONFIG.url;
    this.token = YOUTRACK_CONFIG.token;
    this.projectName = YOUTRACK_CONFIG.projectName;

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
  }

  /**
   * Validate the YouTrack token by making a test request
   * @returns True if the token is valid, false otherwise
   */
  public async validateToken(): Promise<boolean> {
    try {
      await this.client.get('/users/me');
      return true;
    } catch (error) {
      console.error('Error validating YouTrack token:', error);
      return false;
    }
  }

  /**
   * Create a new task in YouTrack
   * @param task The task creation request
   * @returns The created task or null if creation failed
   */

  public async getProjectId(): Promise<string> {
    const result = await this.client.get(`/admin/projects?fields=id,name`);
    return result.data.filter((r: { name: string; id: string; $type: string}) => r.name == this.projectName)[0].id;
  }

  public async createTask(task: YouTrackTaskCreationRequest): Promise<YouTrackTask | null> {
    try {
      task.$type = "Issue";

      if (!this.projectId) {
        this.projectId = await this.getProjectId()
      }
      task.project = {id: this.projectId, $type: "Project"};


      const response = await this.client.post('/issues', task);
      return response.data as YouTrackTask;
    } catch (error) {
      console.error('Error creating YouTrack task:', error);
      return null;
    }
  }


  /**
   * Update an existing task in YouTrack
   * @param taskId The ID of the task to update
   * @param update The task update request
   * @returns True if the update was successful, false otherwise
   */
  public async updateTask(taskId: string, update: YouTrackTaskUpdateRequest): Promise<boolean> {
    try {
      if (!update.$type) {
        update.$type = "Issue";
      }

      await this.client.post(`/issues/${taskId}`, update);
      return true;
    } catch (error) {
      console.error(`Error updating YouTrack task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Get a task by its ID
   * @param taskId The ID of the task to retrieve
   * @returns The task or null if not found
   */
  public async getTaskById(taskId: string): Promise<YouTrackTask | null> {
    try {
      const response = await this.client.get(`/issues/${taskId}`, {
        params: {
          fields: 'id,idReadable,summary,description,created,updated,resolved,customFields(name,value),comments(id,text,created,updated,author(login,fullName))'
        }
      });
      return response.data as YouTrackTask;
    } catch (error) {
      console.error(`Error fetching YouTrack task ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Add a comment to a task
   * @param taskId The ID of the task
   * @param text The comment text
   * @returns The created comment or null if creation failed
   */
  public async addComment(taskId: string, text: string): Promise<YouTrackComment | null> {
    try {
      const response = await this.client.post(`/issues/${taskId}/comments`, {
        text,
        $type: "IssueComment",
        issue: {
          id: taskId,
          $type: "Issue"
        }
      });
      return response.data as YouTrackComment;
    } catch (error) {
      console.error(`Error adding comment to YouTrack task ${taskId}:`, error);
      return null;
    }
  }
}