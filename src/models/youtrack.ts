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
  name: string;
  $type: string;
  value?: {
    name?: string;
  } | null;
}

// YouTrack task creation request
export interface YouTrackTaskCreationRequest {
  $type?: string;
  project: {
    id: string;
    $type?: string;
  };
  summary: string;
  description: string | null;
  customFields?: YouTrackCustomField[];
}

// YouTrack task update request
export interface YouTrackTaskUpdateRequest {
  $type?: string;
  summary?: string;
  description?: string;
  customFields?: YouTrackCustomField[];
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

export interface YouTrackTag {
  id: string;
}
