-- Fire22 Dashboard Worker - Task Management Database Schema
-- Compatible with MySQL/MariaDB, PostgreSQL, and SQLite via Bun.SQL

-- Departments table
CREATE TABLE IF NOT EXISTS departments (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    icon VARCHAR(10),
    description TEXT,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id VARCHAR(36) PRIMARY KEY,
    department_id VARCHAR(36) NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(100),
    avatar_url VARCHAR(500),
    efficiency_score INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
);

-- Tasks table (enhanced with new fields)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- SQLite compatible
    uuid VARCHAR(36) UNIQUE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('planning', 'active', 'in-progress', 'review', 'completed', 'cancelled') DEFAULT 'planning',
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    
    -- Assignment
    department_id VARCHAR(36) NOT NULL,
    assignee_id VARCHAR(36),
    reporter_id VARCHAR(36),
    
    -- Dates
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_date TIMESTAMP,
    
    -- Metadata
    estimated_hours INTEGER,
    actual_hours INTEGER,
    story_points INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES team_members(id) ON DELETE SET NULL,
    FOREIGN KEY (reporter_id) REFERENCES team_members(id) ON DELETE SET NULL
);

-- Task tags (many-to-many relationship)
CREATE TABLE IF NOT EXISTS task_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_uuid VARCHAR(36) NOT NULL,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_uuid) REFERENCES tasks(uuid) ON DELETE CASCADE,
    UNIQUE(task_uuid, tag)
);

-- Task dependencies
CREATE TABLE IF NOT EXISTS task_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_uuid VARCHAR(36) NOT NULL,
    depends_on_uuid VARCHAR(36) NOT NULL,
    dependency_type ENUM('blocks', 'relates_to', 'duplicates') DEFAULT 'blocks',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_uuid) REFERENCES tasks(uuid) ON DELETE CASCADE,
    FOREIGN KEY (depends_on_uuid) REFERENCES tasks(uuid) ON DELETE CASCADE,
    UNIQUE(task_uuid, depends_on_uuid)
);

-- Task comments and activity history
CREATE TABLE IF NOT EXISTS task_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_uuid VARCHAR(36) NOT NULL,
    user_id VARCHAR(36),
    activity_type ENUM('comment', 'status_change', 'assignment', 'progress_update', 'due_date_change', 'priority_change') NOT NULL,
    old_value TEXT,
    new_value TEXT,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_uuid) REFERENCES tasks(uuid) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES team_members(id) ON DELETE SET NULL
);

-- Task attachments
CREATE TABLE IF NOT EXISTS task_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_uuid VARCHAR(36) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_url VARCHAR(500),
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by VARCHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_uuid) REFERENCES tasks(uuid) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES team_members(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_task_tags_task ON task_tags(task_uuid);
CREATE INDEX IF NOT EXISTS idx_task_activities_task ON task_activities(task_uuid);
CREATE INDEX IF NOT EXISTS idx_task_activities_created ON task_activities(created_at);