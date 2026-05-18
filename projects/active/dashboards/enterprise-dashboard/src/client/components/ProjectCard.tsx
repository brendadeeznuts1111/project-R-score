import type { Project } from "../../types";

interface ProjectCardProps {
  project: Project;
  isSelected?: boolean;
  onOpenProject?: (project: Project) => void;
  onGitAction?: (project: Project, action: string) => void;
  onRescan?: (project: Project) => void;
}

// Compact status icons
const statusIcons = {
  clean: { icon: "●", class: "text-green-500", bg: "bg-green-500/20" },
  modified: { icon: "◐", class: "text-yellow-500", bg: "bg-yellow-500/20" },
  staged: { icon: "◉", class: "text-blue-500", bg: "bg-blue-500/20" },
  conflict: { icon: "✕", class: "text-red-500", bg: "bg-red-500/20" },
};

export function ProjectCard({ project, isSelected = false, onOpenProject, onGitAction, onRescan }: ProjectCardProps) {
  const getHealthClass = (health: number) => {
    if (health >= 90) return "health-excellent";
    if (health >= 70) return "health-good";
    if (health >= 40) return "health-warning";
    return "health-critical";
  };

  const getHealthLabel = (health: number) => {
    if (health >= 90) return "Excellent";
    if (health >= 70) return "Good";
    if (health >= 40) return "Fair";
    return "Critical";
  };

  const remoteInfo = {
    ahead: { icon: "↑", text: `${project.aheadBy}↑`, class: "text-blue-500" },
    behind: { icon: "↓", text: `${project.behindBy}↓`, class: "text-yellow-500" },
    "up-to-date": { icon: "✓", text: "✓", class: "text-green-500" },
    diverged: { icon: "⇅", text: "⇅", class: "text-red-500" },
  };

  const remote = remoteInfo[project.remote];
  const status = statusIcons[project.status] || statusIcons.clean;

  return (
    <div
      className={`project-card p-4 relative group ${isSelected ? "border-blue-500" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`Project ${project.name}, status ${project.status}, health ${project.health}%, branch ${project.branch}, ${project.modifiedFiles} modified files`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenProject?.(project);
        }
      }}
      onClick={() => onOpenProject?.(project)}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-lg z-10">
          ✱
        </div>
      )}

      {/* Hover Action Toolbar */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20">
        <div className="flex gap-0.5 bg-gray-900/90 dark:bg-black/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
          <button
            onClick={(e) => { e.stopPropagation(); onGitAction?.(project, "status"); }}
            className="p-2 hover:bg-white/20 rounded transition-colors text-gray-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Git Status"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onGitAction?.(project, "log"); }}
            className="p-2 hover:bg-white/20 rounded transition-colors text-gray-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Recent Commits"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onOpenProject?.(project); }}
            className="p-2 hover:bg-white/20 rounded transition-colors text-gray-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Open Directory"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onRescan?.(project); }}
            className="p-2 hover:bg-white/20 rounded transition-colors text-gray-300 hover:text-white min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Rescan Project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Header - Compact */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate" title={project.name}>
              {project.name}
            </h3>
            {isSelected && <span className="text-blue-500 text-xs">*</span>}
            {/* Open Project Link */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenProject?.(project);
              }}
              className="text-gray-400 hover:text-blue-500 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              title={`Open ${project.name} in Finder`}
              aria-label={`Open ${project.name} directory`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-mono">{project.branch}</span>
            <span className={remote.class}>{remote.text}</span>
          </div>
        </div>
        {/* Compact Status Badge */}
        <div className={`w-8 h-8 rounded-lg ${status.bg} flex items-center justify-center`} title={project.status}>
          <span className={`text-lg ${status.class}`}>{status.icon}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-3">
        {/* Modified Files */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modified
          </span>
          <span className={`text-sm font-medium ${project.modifiedFiles > 0 ? "text-yellow-500" : "text-gray-400"}`}>
            {project.modifiedFiles} {project.modifiedFiles === 1 ? "file" : "files"}
          </span>
        </div>

        {/* Remote Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            Remote
          </span>
          <span className={`text-sm font-medium ${remote.class}`}>
            {remote.text}
          </span>
        </div>

        {/* Health Bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Health
            </span>
            <span className={`text-sm font-medium ${project.health >= 70 ? "text-green-500" : project.health >= 40 ? "text-yellow-500" : "text-red-500"}`}>
              {project.health}% - {getHealthLabel(project.health)}
            </span>
          </div>
          <div className="health-bar">
            <div
              className={`health-bar-fill ${getHealthClass(project.health)}`}
              style={{ width: `${project.health}%` }}
            />
          </div>
        </div>
      </div>

      {/* Last Commit */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2" title={project.lastCommit}>
            {project.lastCommit}
          </p>
        </div>
      </div>
    </div>
  );
}
