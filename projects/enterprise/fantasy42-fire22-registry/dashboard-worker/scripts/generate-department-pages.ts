#!/usr/bin/env bun

/**
 * 📊 Generate Department Documentation Pages
 * Creates static HTML pages for all Fire22 departments
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface Department {
  id: string;
  name: string;
  email: string;
  domain: string;
  color: string;
  icon: string;
  description: string;
  responsibilities: string[];
  contacts: Array<{
    name: string;
    role: string;
    email: string;
  }>;
}

class DepartmentPagesGenerator {
  private readonly srcDir = join(process.cwd(), 'src');
  private readonly distDir = join(process.cwd(), 'dist', 'pages', 'departments');
  private departments: Department[] = [];

  constructor() {
    this.loadDepartments();
  }

  private loadDepartments(): void {
    try {
      // Load team directory
      const teamDirectoryPath = join(this.srcDir, 'communications', 'team-directory.json');
      if (existsSync(teamDirectoryPath)) {
        const teamDirectory = JSON.parse(readFileSync(teamDirectoryPath, 'utf-8'));
        this.departments = teamDirectory.departments || [];
      }

      // Load department configurations
      const deptConfigPath = join(this.srcDir, 'departments', 'config.json');
      if (existsSync(deptConfigPath)) {
        const deptConfig = JSON.parse(readFileSync(deptConfigPath, 'utf-8'));
        // Merge configurations
        if (deptConfig.departments && Array.isArray(deptConfig.departments)) {
          this.departments = this.mergeDepartmentData(this.departments, deptConfig.departments);
        }
      }

      // Ensure departments is always an array
      if (!Array.isArray(this.departments)) {
        this.departments = [];
      }
    } catch (error) {
      console.error('❌ Error loading departments:', error);
      this.departments = [];
    }
  }

  private mergeDepartmentData(base: Department[], additional: any[]): Department[] {
    const merged = [...base];

    additional.forEach(dept => {
      const existing = merged.find(d => d.id === dept.id);
      if (existing) {
        Object.assign(existing, dept);
      } else {
        merged.push(dept);
      }
    });

    return merged;
  }

  public async generate(): Promise<void> {
    console.log('📊 Generating Department Pages');
    console.log('!==!==!==!==!==!==');

    // Create output directory
    if (!existsSync(this.distDir)) {
      mkdirSync(this.distDir, { recursive: true });
    }

    // Generate index page
    await this.generateIndexPage();

    // Generate individual department pages
    for (const department of this.departments) {
      await this.generateDepartmentPage(department);
    }

    // Generate department matrix page
    await this.generateMatrixPage();

    console.log(`✅ Generated ${this.departments.length} department pages`);
  }

  private async generateIndexPage(): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Fire22 Departments</title>
    <link rel="stylesheet" href="/assets/styles.css">
    <style>
        .department-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
            padding: 20px;
        }
        .department-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            transition: transform 0.2s;
        }
        .department-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <header>
        <h1>🏢 Fire22 Departments</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/departments">Departments</a>
            <a href="/wiki">Wiki</a>
            <a href="/feeds">RSS Feeds</a>
        </nav>
    </header>
    
    <main>
        <div class="department-grid">
            ${this.departments
              .map(
                dept => `
            <div class="department-card" style="border-color: ${dept.color}">
                <h2>${dept.icon || '🏢'} ${dept.name}</h2>
                <p>${dept.description || 'Fire22 Department'}</p>
                <a href="/departments/${dept.id}.html" class="btn">View Department</a>
            </div>
            `
              )
              .join('')}
        </div>
    </main>
    
    <footer>
        <p>&copy; 2024 Fire22. All rights reserved.</p>
    </footer>
</body>
</html>`;

    writeFileSync(join(this.distDir, 'index.html'), html);
    console.log('✅ Generated departments index page');
  }

  private async generateDepartmentPage(department: Department): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${department.name} - Fire22</title>
    <link rel="stylesheet" href="/assets/styles.css">
    <style>
        .department-header {
            background: linear-gradient(135deg, ${department.color}22, ${department.color}44);
            padding: 40px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .contact-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        .contact-card {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <header>
        <nav>
            <a href="/">Home</a>
            <a href="/departments">All Departments</a>
            <a href="/wiki/departments/${department.id}.md">Wiki</a>
        </nav>
    </header>
    
    <main>
        <div class="department-header">
            <h1>${department.icon || '🏢'} ${department.name}</h1>
            <p>📧 ${department.email}</p>
            <p>🌐 ${department.domain}</p>
        </div>
        
        <section>
            <h2>Description</h2>
            <p>${department.description || 'This department handles critical Fire22 operations.'}</p>
        </section>
        
        <section>
            <h2>Responsibilities</h2>
            <ul>
                ${(department.responsibilities || []).map(r => `<li>${r}</li>`).join('')}
            </ul>
        </section>
        
        <section>
            <h2>Team Contacts</h2>
            <div class="contact-list">
                ${(department.contacts || [])
                  .map(
                    contact => `
                <div class="contact-card">
                    <h3>${contact.name}</h3>
                    <p><strong>${contact.role}</strong></p>
                    <p>📧 <a href="mailto:${contact.email}">${contact.email}</a></p>
                </div>
                `
                  )
                  .join('')}
            </div>
        </section>
        
        <section>
            <h2>Resources</h2>
            <ul>
                <li><a href="/wiki/departments/${department.id}.md">Department Wiki</a></li>
                <li><a href="/api/departments/${department.id}">API Endpoint</a></li>
                <li><a href="/feeds/${department.id}-rss.xml">RSS Feed</a></li>
            </ul>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 Fire22 ${department.name}. All rights reserved.</p>
    </footer>
</body>
</html>`;

    writeFileSync(join(this.distDir, `${department.id}.html`), html);
    console.log(`✅ Generated page for ${department.name}`);
  }

  private async generateMatrixPage(): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Department Matrix - Fire22</title>
    <link rel="stylesheet" href="/assets/styles.css">
    <style>
        .matrix-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .matrix-table th, .matrix-table td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        .matrix-table th {
            background: #f5f5f5;
        }
        .status-active { color: green; }
        .status-inactive { color: orange; }
    </style>
</head>
<body>
    <header>
        <h1>📊 Department Matrix</h1>
        <nav>
            <a href="/">Home</a>
            <a href="/departments">Departments</a>
            <a href="/wiki">Wiki</a>
        </nav>
    </header>
    
    <main>
        <table class="matrix-table">
            <thead>
                <tr>
                    <th>Department</th>
                    <th>Email</th>
                    <th>Domain</th>
                    <th>Team Size</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${this.departments
                  .map(
                    dept => `
                <tr>
                    <td>${dept.icon || '🏢'} ${dept.name}</td>
                    <td><a href="mailto:${dept.email}">${dept.email}</a></td>
                    <td>${dept.domain}</td>
                    <td>${(dept.contacts || []).length}</td>
                    <td class="status-active">Active</td>
                    <td>
                        <a href="/departments/${dept.id}.html">View</a> |
                        <a href="/wiki/departments/${dept.id}.md">Wiki</a> |
                        <a href="/api/departments/${dept.id}">API</a>
                    </td>
                </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
        
        <section>
            <h2>Statistics</h2>
            <ul>
                <li>Total Departments: ${this.departments.length}</li>
                <li>Total Team Members: ${this.departments.reduce((sum, d) => sum + (d.contacts || []).length, 0)}</li>
                <li>Active Departments: ${this.departments.length}</li>
            </ul>
        </section>
    </main>
    
    <footer>
        <p>&copy; 2024 Fire22. Generated on ${new Date().toISOString()}</p>
    </footer>
</body>
</html>`;

    writeFileSync(join(this.distDir, 'matrix.html'), html);
    console.log('✅ Generated department matrix page');
  }
}

// Run generator
const generator = new DepartmentPagesGenerator();
generator.generate().catch(console.error);
