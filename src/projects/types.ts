export interface Project {
  id: string;
  name: string;
  description?: string;
  defaultUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  defaultUrl?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  defaultUrl?: string;
}
