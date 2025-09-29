// YouTrack task model
export interface YouTrackTask {
  id: string;
  idReadable: string;
  summary: string;
  description: string;
  created: number;
  updated: number;
  resolved: number | null;
  customFields: YouTrackCustomField[];
  comments: YouTrackComment[];
}

// YouTrack custom field model
export interface YouTrackCustomField {
  $type: string;
  name?: string;

  field?: {
    name: string;
    $type: string;
    fieldType: {
      id: string;
      $type: string;
    }
  };

  value?: {
    name?: string;
    id?: string;
    $type?: string;
    login?: string;
  } | string | number | null;
}

export interface YouTrackComment {
  id: string;
  text: string;
  created: number;
  updated: number;
  author: {
    login: string;
    fullName: string;
  };
}

// YouTrack task creation request
export interface YouTrackTaskCreationRequest {
  $type: "Issue";
  project: {
    id: string;
    $type: "Project";
  };
  summary: string;
  description: string;
  customFields?: YouTrackCustomField[];
}

// YouTrack task update request
export interface YouTrackTaskUpdateRequest {
  $type: "Issue";
  summary?: string;
  description?: string;
  customFields?: YouTrackCustomField[];
}
