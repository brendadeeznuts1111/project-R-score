/**
 * Seed Employee Data for Fire22 Personal Subdomains
 * Populates KV namespace with employee information
 */

interface EmployeeData {
  id: string;
  name: string;
  title: string;
  department: string;
  email: string;
  phone?: string;
  slack?: string;
  telegram?: string;
  bio: string;
  headshotUrl?: string;
  tier: 1 | 2 | 3 | 4 | 5;
  template: string;
  features: string[];
  manager?: string;
  directReports?: string[];
  hireDate: string;
  lastUpdated: string;
}

// Employee data based on the Fire22 team directory
const employees: EmployeeData[] = [
  // Executive Team (Tier 1)
  {
    id: 'william-harris',
    name: 'William Harris',
    title: 'Chief Executive Officer',
    department: 'Management',
    email: 'william.harris@fire22.com',
    phone: '+1-555-0101',
    slack: 'william.harris',
    telegram: '@williamharris_ceo',
    bio: "Visionary leader driving Fire22's mission to revolutionize the industry through innovative technology and exceptional service. 15+ years of executive experience in high-growth companies.",
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['Patricia Clark', 'Chris Brown', 'Jennifer Adams'],
    hireDate: '2020-01-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'patricia-clark',
    name: 'Patricia Clark',
    title: 'Chief Operating Officer',
    department: 'Operations',
    email: 'patricia.clark@fire22.com',
    phone: '+1-555-0102',
    slack: 'patricia.clark',
    telegram: '@patriciaclark_coo',
    bio: 'Operations excellence expert with a passion for building scalable systems and high-performing teams. Former VP of Operations at Fortune 500 companies.',
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['David Martinez', 'Jennifer Lee'],
    hireDate: '2020-02-01',
    lastUpdated: new Date().toISOString(),
  },

  // Department Heads (Tier 1-2)
  {
    id: 'chris-brown',
    name: 'Chris Brown',
    title: 'Chief Technology Officer',
    department: 'Technology',
    email: 'chris.brown@fire22.com',
    phone: '+1-555-0201',
    slack: 'chris.brown',
    telegram: '@chrisbrown_cto',
    bio: 'Technology innovation leader specializing in cloud architecture, AI/ML, and scalable systems. Former tech lead at major Silicon Valley companies.',
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['Amanda Garcia', 'Danny Kim', 'Sophia Zhang'],
    hireDate: '2020-03-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'jennifer-adams',
    name: 'Jennifer Adams',
    title: 'Director of Human Resources',
    department: 'HR',
    email: 'jennifer.adams@fire22.com',
    phone: '+1-555-0301',
    slack: 'jennifer.adams',
    telegram: '@jenniferadams_hr',
    bio: 'HR leader focused on building inclusive cultures and developing world-class teams. Expert in talent acquisition, employee experience, and organizational development.',
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['Marcus Rivera'],
    hireDate: '2020-04-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sarah-martinez',
    name: 'Sarah Martinez',
    title: 'Communications Director',
    department: 'Communications',
    email: 'sarah.martinez@fire22.com',
    phone: '+1-555-0401',
    slack: 'sarah.martinez',
    telegram: '@sarahmartinez_comm',
    bio: 'Strategic communications expert specializing in brand storytelling, internal communications, and stakeholder engagement. Former agency executive.',
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['Alex Chen', 'Maria Rodriguez'],
    hireDate: '2020-05-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'isabella-martinez',
    name: 'Isabella Martinez',
    title: 'Design Director',
    department: 'Design',
    email: 'isabella.martinez@fire22.com',
    phone: '+1-555-0501',
    slack: 'isabella.martinez',
    telegram: '@isabellamartinez_design',
    bio: 'Creative director with expertise in UX/UI design, brand identity, and user-centered design. Award-winning designer with 10+ years of experience.',
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['Ethan Cooper', 'Maya Patel'],
    hireDate: '2020-06-01',
    lastUpdated: new Date().toISOString(),
  },

  // VIP Management (Tier 5 - CRITICAL)
  {
    id: 'vinny2times',
    name: 'Vinny2Times',
    title: 'Head of VIP Management',
    department: 'VIP Management',
    email: 'vinny2times@fire22.com',
    phone: '+1-555-0601',
    slack: 'vinny2times',
    telegram: '@vinny2times_vip',
    bio: 'VIP customer experience specialist with deep expertise in high-touch client management, escalation handling, and premium service delivery. References commit 5d3e189.',
    tier: 5,
    template: 'vip',
    features: ['scheduling', 'vip-tools', 'analytics', 'custom-features', 'escalation-system'],
    hireDate: '2024-08-01',
    lastUpdated: new Date().toISOString(),
  },

  // Finance Department (Tier 2-3)
  {
    id: 'john-smith',
    name: 'John Smith',
    title: 'Finance Director',
    department: 'Finance',
    email: 'john.smith@fire22.com',
    phone: '+1-555-1001',
    slack: 'john.smith',
    bio: 'Financial strategy and operations leader with expertise in budgeting, forecasting, and financial planning. CPA with 12+ years of experience.',
    tier: 2,
    template: 'management',
    features: ['scheduling', 'team-management', 'advanced-tools'],
    directReports: ['Sarah Johnson', 'Mike Chen', 'Anna Lee'],
    hireDate: '2021-01-15',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sarah-johnson',
    name: 'Sarah Johnson',
    title: 'Senior Financial Analyst',
    department: 'Finance',
    email: 'sarah.johnson@fire22.com',
    phone: '+1-555-1002',
    slack: 'sarah.johnson',
    bio: 'Financial analysis expert specializing in data-driven insights, budgeting, and financial modeling. MBA with focus on corporate finance.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'John Smith',
    hireDate: '2021-03-01',
    lastUpdated: new Date().toISOString(),
  },

  // Technology Department (Tier 2-3)
  {
    id: 'amanda-garcia',
    name: 'Amanda Garcia',
    title: 'Lead Developer',
    department: 'Technology',
    email: 'amanda.garcia@fire22.com',
    phone: '+1-555-2001',
    slack: 'amanda.garcia',
    bio: 'Full-stack development lead with expertise in modern web technologies, cloud architecture, and agile development practices.',
    tier: 2,
    template: 'management',
    features: ['scheduling', 'team-management', 'advanced-tools'],
    manager: 'Chris Brown',
    hireDate: '2021-02-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'danny-kim',
    name: 'Danny Kim',
    title: 'Full Stack Developer',
    department: 'Technology',
    email: 'danny.kim@fire22.com',
    phone: '+1-555-2002',
    slack: 'danny.kim',
    bio: 'Full-stack developer specializing in React, Node.js, and cloud-native applications. Passionate about clean code and scalable architecture.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Amanda Garcia',
    hireDate: '2021-04-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sophia-zhang',
    name: 'Sophia Zhang',
    title: 'DevOps Engineer',
    department: 'Technology',
    email: 'sophia.zhang@fire22.com',
    phone: '+1-555-2003',
    slack: 'sophia.zhang',
    bio: 'DevOps engineer focused on CI/CD pipelines, infrastructure automation, and cloud-native deployments. Kubernetes and AWS certified.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Chris Brown',
    hireDate: '2021-05-01',
    lastUpdated: new Date().toISOString(),
  },

  // Customer Support (Tier 3-4)
  {
    id: 'emily-davis',
    name: 'Emily Davis',
    title: 'Support Manager',
    department: 'Customer Support',
    email: 'emily.davis@fire22.com',
    phone: '+1-555-3001',
    slack: 'emily.davis',
    bio: 'Customer experience leader with expertise in support operations, team management, and customer satisfaction improvement.',
    tier: 2,
    template: 'management',
    features: ['scheduling', 'team-management', 'advanced-tools'],
    directReports: ['Alex Wilson', 'Natalie Brown'],
    hireDate: '2021-06-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'alex-wilson',
    name: 'Alex Wilson',
    title: 'Senior Support Agent',
    department: 'Customer Support',
    email: 'alex.wilson@fire22.com',
    phone: '+1-555-3002',
    slack: 'alex.wilson',
    bio: 'Senior support specialist with deep product knowledge and expertise in complex customer issue resolution.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Emily Davis',
    hireDate: '2021-07-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'natalie-brown',
    name: 'Natalie Brown',
    title: 'Support Specialist',
    department: 'Customer Support',
    email: 'natalie.brown@fire22.com',
    phone: '+1-555-3003',
    slack: 'natalie.brown',
    bio: 'Customer support specialist focused on providing exceptional service and building strong customer relationships.',
    tier: 4,
    template: 'standard',
    features: ['basic-tools'],
    manager: 'Emily Davis',
    hireDate: '2021-08-01',
    lastUpdated: new Date().toISOString(),
  },

  // Compliance (Tier 2-3)
  {
    id: 'lisa-anderson',
    name: 'Lisa Anderson',
    title: 'Compliance Officer',
    department: 'Compliance',
    email: 'lisa.anderson@fire22.com',
    phone: '+1-555-4001',
    slack: 'lisa.anderson',
    bio: 'Compliance and regulatory affairs specialist with expertise in industry regulations, risk management, and compliance reporting.',
    tier: 2,
    template: 'management',
    features: ['scheduling', 'team-management', 'advanced-tools'],
    directReports: ['Robert Taylor'],
    hireDate: '2021-09-01',
    lastUpdated: new Date().toISOString(),
  },

  // Operations (Tier 2-4)
  {
    id: 'david-martinez',
    name: 'David Martinez',
    title: 'Operations Director',
    department: 'Operations',
    email: 'david.martinez@fire22.com',
    phone: '+1-555-5001',
    slack: 'david.martinez',
    bio: 'Operations management expert specializing in process optimization, workflow efficiency, and operational excellence.',
    tier: 1,
    template: 'executive',
    features: ['scheduling', 'analytics', 'team-management', 'advanced-tools'],
    directReports: ['Jennifer Lee'],
    hireDate: '2020-07-01',
    lastUpdated: new Date().toISOString(),
  },

  // Marketing (Tier 3-4)
  {
    id: 'michelle-rodriguez',
    name: 'Michelle Rodriguez',
    title: 'Marketing Director',
    department: 'Marketing',
    email: 'michelle.rodriguez@fire22.com',
    phone: '+1-555-6001',
    slack: 'michelle.rodriguez',
    bio: 'Marketing strategy leader with expertise in digital marketing, brand development, and customer acquisition.',
    tier: 2,
    template: 'management',
    features: ['scheduling', 'team-management', 'advanced-tools'],
    directReports: ['Kevin Thompson'],
    hireDate: '2021-10-01',
    lastUpdated: new Date().toISOString(),
  },

  // Team Contributors (Tier 3-4)
  {
    id: 'jane-smith',
    name: 'Jane Smith',
    title: 'Senior Contributor',
    department: 'Contributors',
    email: 'jane.smith@fire22.com',
    phone: '+1-555-7001',
    slack: 'jane.smith',
    bio: 'Senior contributor with specialized expertise in quality assurance, testing methodologies, and process improvement.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    hireDate: '2021-11-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'michael-davis',
    name: 'Michael Davis',
    title: 'Technical Contributor',
    department: 'Contributors',
    email: 'michael.davis@fire22.com',
    phone: '+1-555-7002',
    slack: 'michael.davis',
    bio: 'Technical contributor specializing in system integration, API development, and technical documentation.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    hireDate: '2021-12-01',
    lastUpdated: new Date().toISOString(),
  },

  // Design Team (Tier 3-4)
  {
    id: 'ethan-cooper',
    name: 'Ethan Cooper',
    title: 'UI/UX Designer',
    department: 'Design',
    email: 'ethan.cooper@fire22.com',
    phone: '+1-555-8001',
    slack: 'ethan.cooper',
    bio: 'UI/UX designer focused on creating intuitive user experiences and beautiful, functional interfaces.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Isabella Martinez',
    hireDate: '2022-01-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'maya-patel',
    name: 'Maya Patel',
    title: 'Visual Designer',
    department: 'Design',
    email: 'maya.patel@fire22.com',
    phone: '+1-555-8002',
    slack: 'maya.patel',
    bio: 'Visual designer specializing in brand identity, graphic design, and visual communication.',
    tier: 4,
    template: 'standard',
    features: ['basic-tools'],
    manager: 'Isabella Martinez',
    hireDate: '2022-02-01',
    lastUpdated: new Date().toISOString(),
  },

  // HR Team (Tier 2-4)
  {
    id: 'marcus-rivera',
    name: 'Marcus Rivera',
    title: 'HR Coordinator',
    department: 'HR',
    email: 'marcus.rivera@fire22.com',
    phone: '+1-555-9001',
    slack: 'marcus.rivera',
    bio: 'HR coordinator supporting recruitment, onboarding, and employee relations with a focus on creating positive employee experiences.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Jennifer Adams',
    hireDate: '2022-03-01',
    lastUpdated: new Date().toISOString(),
  },

  // Communications Team (Tier 3-4)
  {
    id: 'alex-chen',
    name: 'Alex Chen',
    title: 'Internal Communications Manager',
    department: 'Communications',
    email: 'alex.chen@fire22.com',
    phone: '+1-555-9101',
    slack: 'alex.chen',
    bio: 'Internal communications specialist focused on employee engagement, company culture, and organizational messaging.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Sarah Martinez',
    hireDate: '2022-04-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'maria-rodriguez',
    name: 'Maria Rodriguez',
    title: 'Communications Coordinator',
    department: 'Communications',
    email: 'maria.rodriguez@fire22.com',
    phone: '+1-555-9102',
    slack: 'maria.rodriguez',
    bio: 'Communications coordinator supporting content creation, social media management, and internal communications initiatives.',
    tier: 4,
    template: 'standard',
    features: ['basic-tools'],
    manager: 'Sarah Martinez',
    hireDate: '2022-05-01',
    lastUpdated: new Date().toISOString(),
  },

  // Additional Team Members
  {
    id: 'robert-taylor',
    name: 'Robert Taylor',
    title: 'Legal Advisor',
    department: 'Compliance',
    email: 'robert.taylor@fire22.com',
    phone: '+1-555-4002',
    slack: 'robert.taylor',
    bio: 'Legal advisor specializing in contract law, regulatory compliance, and corporate governance.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Lisa Anderson',
    hireDate: '2021-09-15',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'jennifer-lee',
    name: 'Jennifer Lee',
    title: 'Operations Manager',
    department: 'Operations',
    email: 'jennifer.lee@fire22.com',
    phone: '+1-555-5002',
    slack: 'jennifer.lee',
    bio: 'Operations manager focused on process improvement, team coordination, and operational efficiency.',
    tier: 2,
    template: 'management',
    features: ['scheduling', 'team-management', 'advanced-tools'],
    manager: 'David Martinez',
    hireDate: '2021-08-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'kevin-thompson',
    name: 'Kevin Thompson',
    title: 'Digital Marketing Lead',
    department: 'Marketing',
    email: 'kevin.thompson@fire22.com',
    phone: '+1-555-6002',
    slack: 'kevin.thompson',
    bio: 'Digital marketing specialist with expertise in SEO, content marketing, and performance marketing campaigns.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'Michelle Rodriguez',
    hireDate: '2021-11-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'rachel-wilson',
    name: 'Rachel Wilson',
    title: 'QA Contributor',
    department: 'Contributors',
    email: 'rachel.wilson@fire22.com',
    phone: '+1-555-7003',
    slack: 'rachel.wilson',
    bio: 'Quality assurance specialist with expertise in test automation, manual testing, and quality process improvement.',
    tier: 4,
    template: 'standard',
    features: ['basic-tools'],
    hireDate: '2022-01-15',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'james-taylor',
    name: 'James Taylor',
    title: 'DevOps Contributor',
    department: 'Contributors',
    email: 'james.taylor@fire22.com',
    phone: '+1-555-7004',
    slack: 'james.taylor',
    bio: 'DevOps contributor specializing in infrastructure automation, monitoring, and deployment pipelines.',
    tier: 4,
    template: 'standard',
    features: ['basic-tools'],
    hireDate: '2022-02-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'mike-chen',
    name: 'Mike Chen',
    title: 'Treasury Manager',
    department: 'Finance',
    email: 'mike.chen@fire22.com',
    phone: '+1-555-1003',
    slack: 'mike.chen',
    bio: 'Treasury management specialist with expertise in cash flow management, investments, and financial risk management.',
    tier: 3,
    template: 'specialist',
    features: ['scheduling', 'specialized-tools'],
    manager: 'John Smith',
    hireDate: '2021-04-01',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'anna-lee',
    name: 'Anna Lee',
    title: 'Financial Analyst',
    department: 'Finance',
    email: 'anna.lee@fire22.com',
    phone: '+1-555-1004',
    slack: 'anna.lee',
    bio: 'Financial analyst specializing in financial modeling, variance analysis, and budgeting support.',
    tier: 4,
    template: 'standard',
    features: ['basic-tools'],
    manager: 'John Smith',
    hireDate: '2021-05-01',
    lastUpdated: new Date().toISOString(),
  },
];

/**
 * Seed employee data into KV namespace
 */
export async function seedEmployeeData(env: any) {
  console.log(`🌱 Seeding data for ${employees.length} employees...`);

  for (const employee of employees) {
    const key = `employee:${employee.id}`;
    try {
      await env.EMPLOYEE_DATA.put(key, JSON.stringify(employee));
      console.log(`✅ Seeded data for ${employee.name} (${employee.id})`);
    } catch (error) {
      console.error(`❌ Failed to seed data for ${employee.name}:`, error);
    }
  }

  console.log('🎉 Employee data seeding complete!');
}

/**
 * Get employee by ID
 */
export async function getEmployee(env: any, id: string): Promise<EmployeeData | null> {
  try {
    const data = await env.EMPLOYEE_DATA.get(`employee:${id}`);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Error fetching employee ${id}:`, error);
    return null;
  }
}

/**
 * List all employees
 */
export async function listEmployees(env: any): Promise<EmployeeData[]> {
  try {
    const keys = await env.EMPLOYEE_DATA.list();
    const employees: EmployeeData[] = [];

    for (const key of keys.keys) {
      if (key.name.startsWith('employee:')) {
        const data = await env.EMPLOYEE_DATA.get(key.name);
        if (data) {
          employees.push(JSON.parse(data));
        }
      }
    }

    return employees;
  } catch (error) {
    console.error('Error listing employees:', error);
    return [];
  }
}

// Export the employees array for direct access
export { employees };
