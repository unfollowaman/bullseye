import { ProjectRepository, projectRepository } from './repository';
import { CreateProjectInput, Project, UpdateProjectInput } from './types';
import { validateCreateProjectInput, validateUpdateProjectInput } from './validator';

export class ProjectService {
  private repo: ProjectRepository;

  constructor(repo: ProjectRepository = projectRepository) {
    this.repo = repo;
  }

  listProjects(): Project[] {
    return this.repo.getAll();
  }

  getProject(id: string): Project | null {
    return this.repo.getById(id);
  }

  createProject(input: CreateProjectInput): Project {
    const validation = validateCreateProjectInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid project input: ${validation.errors.join('; ')}`);
    }

    const id = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const newProject: Project = {
      id,
      name: input.name.trim(),
      description: input.description?.trim() || '',
      defaultUrl: input.defaultUrl?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };

    return this.repo.save(newProject);
  }

  updateProject(id: string, input: UpdateProjectInput): Project {
    const existing = this.repo.getById(id);
    if (!existing) {
      throw new Error(`Project with ID '${id}' not found`);
    }

    const validation = validateUpdateProjectInput(input);
    if (!validation.valid) {
      throw new Error(`Invalid project update input: ${validation.errors.join('; ')}`);
    }

    const now = new Date().toISOString();

    const updatedProject: Project = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      description:
        input.description !== undefined ? input.description.trim() : existing.description,
      defaultUrl:
        input.defaultUrl !== undefined ? input.defaultUrl.trim() : existing.defaultUrl,
      updatedAt: now,
    };

    return this.repo.save(updatedProject);
  }

  deleteProject(id: string): boolean {
    return this.repo.delete(id);
  }
}

const globalForProjectService = globalThis as unknown as {
  projectService: ProjectService | undefined;
};

export const projectService =
  globalForProjectService.projectService ?? new ProjectService();

if (process.env.NODE_ENV !== 'production') {
  globalForProjectService.projectService = projectService;
}
