/**
 * Projects Handler
 * 
 * Handles project-related routes: list, get, open, git commands.
 */

import { spawn } from "bun";
import type { Project, ApiResponse } from "../../types";

export interface ProjectsHandlerContext {
  projects: Project[];
  trackRequest: (start: number, path?: string) => void;
  trackProjectAccess: (projectId: string, action: "view" | "action", endpoint: string) => void;
}

/**
 * List all projects
 */
export function handleProjectsList(context: ProjectsHandlerContext): Response {
  const start = performance.now();
  context.trackRequest(start, "/api/projects");
  return Response.json({ data: context.projects } satisfies ApiResponse<Project[]>);
}

/**
 * Get a specific project
 */
export function handleProjectGet(
  context: ProjectsHandlerContext,
  projectId: string
): Response {
  const start = performance.now();
  context.trackRequest(start, "/api/projects/:projectId");
  const project = context.projects.find((p) => p.id === projectId || p.name === projectId);
  if (!project) {
    return Response.json({ error: "Project not found" } satisfies ApiResponse<Project>, { status: 404 });
  }
  context.trackProjectAccess(project.id, "view", "/api/projects/:projectId");
  return Response.json({ data: project } satisfies ApiResponse<Project>);
}

/**
 * Open project directory in system file manager
 */
export async function handleProjectOpen(
  context: ProjectsHandlerContext,
  projectId: string
): Promise<Response> {
  const project = context.projects.find((p) => p.id === projectId || p.name === projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Get the actual path from discovered repos
  const { getRepoPath } = await import("../git-scanner");
  const repoPath = await getRepoPath(project.name);

  if (!repoPath) {
    return Response.json({ error: "Project path not found" }, { status: 404 });
  }

  // Open in system file manager (Finder on macOS, Explorer on Windows, etc.)
  const openCmd = process.platform === "darwin" ? "open" :
                  process.platform === "win32" ? "explorer" : "xdg-open";

  try {
    spawn([openCmd, repoPath], { stdout: "ignore", stderr: "ignore" });
    return Response.json({
      data: {
        success: true,
        project: project.name,
        path: repoPath,
      }
    });
  } catch (error) {
    return Response.json({
      error: `Failed to open: ${error instanceof Error ? error.message : "Unknown error"}`
    }, { status: 500 });
  }
}

/**
 * Execute git command on project
 */
export async function handleProjectGit(
  context: ProjectsHandlerContext,
  projectId: string,
  body: { action?: string }
): Promise<Response> {
  const project = context.projects.find((p) => p.id === projectId || p.name === projectId);
  if (!project) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }
  context.trackProjectAccess(project.id, "action", "/api/projects/:projectId/git");

  const action = body.action || "status";

  // Get the actual path from discovered repos
  const { getRepoPath } = await import("../git-scanner");
  const repoPath = await getRepoPath(project.name);

  if (!repoPath) {
    return Response.json({ error: "Project path not found" }, { status: 404 });
  }

  // Map action to git command
  const commands: Record<string, string> = {
    status: "git status --short",
    log: "git log --oneline -10",
    diff: "git diff --stat",
    branch: "git branch -vv",
    remote: "git remote -v",
    stash: "git stash list",
  };

  const cmd = commands[action];
  if (!cmd) {
    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }

  try {
    const proc = spawn(["sh", "-c", cmd], {
      cwd: repoPath,
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    await proc.exited;

    return Response.json({
      data: {
        project: project.name,
        action,
        command: cmd,
        path: repoPath,
        output: stdout.trim(),
        error: stderr.trim() || undefined,
      }
    });
  } catch (error) {
    return Response.json({
      error: `Failed to execute: ${error instanceof Error ? error.message : "Unknown error"}`
    }, { status: 500 });
  }
}
