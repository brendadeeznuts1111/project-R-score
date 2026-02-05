// UUID Generation Utilities using Bun's native crypto.randomUUID()

/**
 * Generate a UUID v4 using Bun's native crypto.randomUUID()
 * This works in Bun, Node.js, and browsers with no dependencies
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate a UUID v7 using Bun's native Bun.randomUUIDv7() (Bun-specific)
 * UUID v7 includes timestamp information for better database indexing
 */
export function generateUUIDv7(): string {
  return Bun.randomUUIDv7();
}

/**
 * Department ID mappings
 */
export const DEPARTMENT_IDS = {
  compliance: '550e8400-e29b-41d4-a716-446655440001',
  'customer-support': '550e8400-e29b-41d4-a716-446655440002',
  finance: '550e8400-e29b-41d4-a716-446655440003',
  management: '550e8400-e29b-41d4-a716-446655440004',
  marketing: '550e8400-e29b-41d4-a716-446655440005',
  operations: '550e8400-e29b-41d4-a716-446655440006',
  'team-contributors': '550e8400-e29b-41d4-a716-446655440007',
  technology: '550e8400-e29b-41d4-a716-446655440008',
  security: '550e8400-e29b-41d4-a716-446655440009',
  'sportsbook-operations': '550e8400-e29b-41d4-a716-446655440010',
} as const;

/**
 * Team member ID mappings with their names and departments
 */
export const TEAM_MEMBER_IDS = {
  // Compliance Department
  'Lisa Anderson': '123e4567-e89b-12d3-a456-426614174001',
  'Mark Thompson': '123e4567-e89b-12d3-a456-426614174002',
  'Sarah Lee': '123e4567-e89b-12d3-a456-426614174003',
  'David Chen': '123e4567-e89b-12d3-a456-426614174004',
  'Emma Wilson': '123e4567-e89b-12d3-a456-426614174005',

  // Customer Support
  'Mike Johnson': '123e4567-e89b-12d3-a456-426614174011',
  'Jennifer Smith': '123e4567-e89b-12d3-a456-426614174012',
  'Robert Brown': '123e4567-e89b-12d3-a456-426614174013',
  'Amanda Garcia': '123e4567-e89b-12d3-a456-426614174014',
  'Chris Martinez': '123e4567-e89b-12d3-a456-426614174015',

  // Finance
  'Sarah Thompson': '123e4567-e89b-12d3-a456-426614174021',
  'Michael Chen': '123e4567-e89b-12d3-a456-426614174022',
  'Jennifer Liu': '123e4567-e89b-12d3-a456-426614174023',
  'Robert Anderson': '123e4567-e89b-12d3-a456-426614174024',
  'Emily Davis': '123e4567-e89b-12d3-a456-426614174025',

  // Management
  'John Smith': '123e4567-e89b-12d3-a456-426614174031',
  'Patricia Johnson': '123e4567-e89b-12d3-a456-426614174032',
  'David Miller': '123e4567-e89b-12d3-a456-426614174033',
  'Susan Lee': '123e4567-e89b-12d3-a456-426614174034',
  'Mark Wilson': '123e4567-e89b-12d3-a456-426614174035',

  // Marketing
  'Amanda Foster': '123e4567-e89b-12d3-a456-426614174041',
  'Kevin Park': '123e4567-e89b-12d3-a456-426614174042',
  'Rachel Green': '123e4567-e89b-12d3-a456-426614174043',
  'Jason White': '123e4567-e89b-12d3-a456-426614174044',
  'Michelle Brown': '123e4567-e89b-12d3-a456-426614174045',

  // Operations
  'Robert Garcia': '123e4567-e89b-12d3-a456-426614174051',
  'Linda Martinez': '123e4567-e89b-12d3-a456-426614174052',
  'James Wilson': '123e4567-e89b-12d3-a456-426614174053',
  'Maria Rodriguez': '123e4567-e89b-12d3-a456-426614174054',
  'Thomas Anderson': '123e4567-e89b-12d3-a456-426614174055',

  // Team Contributors
  'Alex Chen': '123e4567-e89b-12d3-a456-426614174061',
  'Jordan Taylor': '123e4567-e89b-12d3-a456-426614174062',
  'Sam Wilson': '123e4567-e89b-12d3-a456-426614174063',
  'Morgan Lee': '123e4567-e89b-12d3-a456-426614174064',
  'Casey Brown': '123e4567-e89b-12d3-a456-426614174065',

  // Technology
  'David Kim': '123e4567-e89b-12d3-a456-426614174071',
  'Sarah Johnson': '123e4567-e89b-12d3-a456-426614174072',
  'Michael Brown': '123e4567-e89b-12d3-a456-426614174073',
  'Jennifer Chen': '123e4567-e89b-12d3-a456-426614174074',
  'Robert Davis': '123e4567-e89b-12d3-a456-426614174075',
} as const;

/**
 * Get department ID by name
 */
export function getDepartmentId(departmentName: string): string {
  return DEPARTMENT_IDS[departmentName as keyof typeof DEPARTMENT_IDS] || generateUUID();
}

/**
 * Get team member ID by name
 */
export function getTeamMemberId(memberName: string): string {
  return TEAM_MEMBER_IDS[memberName as keyof typeof TEAM_MEMBER_IDS] || generateUUID();
}

/**
 * Generate task UUID using UUID v7 for better database indexing
 */
export function generateTaskUUID(): string {
  return generateUUIDv7();
}
