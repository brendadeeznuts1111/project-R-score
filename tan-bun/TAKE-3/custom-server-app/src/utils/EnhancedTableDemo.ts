import { EnhancedTable } from './EnhancedTable';

/**
 * Demonstration of EnhancedTable capabilities
 */
export function runEnhancedTableDemo() {
  console.log('🚀 EnhancedTable Demo - Advanced Table Operations\n');

  // Demo 1: Table Comparison
  console.log('📊 TABLE COMPARISON DEMO');
  console.log('='.repeat(50));

  const oldData = [
    { id: 1, name: 'Alice', age: 25, city: 'New York', status: 'active' },
    { id: 2, name: 'Bob', age: 30, city: 'Los Angeles', status: 'active' },
    { id: 3, name: 'Charlie', age: 35, city: 'Chicago', status: 'inactive' },
  ];

  const newData = [
    { id: 1, name: 'Alice', age: 26, city: 'New York', status: 'active' }, // Age changed
    { id: 2, name: 'Bob', age: 30, city: 'San Francisco', status: 'active' }, // City changed
    { id: 4, name: 'Diana', age: 28, city: 'Seattle', status: 'active' }, // New record
    // Charlie (id: 3) was removed
  ];

  console.log('Old Data:');
  console.table(oldData);
  console.log('\nNew Data:');
  console.table(newData);

  console.log('\n🔍 Comparison Results (showing differences only):');
  console.log(
    EnhancedTable.compareTables(oldData, newData, 'id', {
      showOnlyDiffs: true,
      diffColor: { h: 210, s: 70, l: 45 },
    })
  );

  // Demo 2: HTML Table Generation
  console.log('\n🌐 HTML TABLE DEMO');
  console.log('='.repeat(50));

  const webData = [
    {
      id: 1,
      product: 'Laptop',
      price: 999.99,
      category: 'Electronics',
      rating: 4.5,
    },
    {
      id: 2,
      product: 'Mouse',
      price: 29.99,
      category: 'Electronics',
      rating: 4.2,
    },
    {
      id: 3,
      product: 'Keyboard',
      price: 79.99,
      category: 'Electronics',
      rating: 4.7,
    },
  ];

  const htmlResult = EnhancedTable.htmlTable(
    webData,
    ['product', 'price', 'category', 'rating'],
    {
      escapeHtml: true,
      addIds: true,
      compact: false,
    }
  );

  console.log('Terminal Output:');
  console.log(htmlResult.terminal);

  console.log('\nHTML Output:');
  console.log(htmlResult.html);

  console.log('\nSafe Data (HTML escaped):');
  console.table(htmlResult.safeData);

  // Demo 3: Data Validation
  console.log('\n✅ DATA VALIDATION DEMO');
  console.log('='.repeat(50));

  const testData = [
    { id: 1, name: 'Valid User', age: 25, email: 'user@example.com' },
    { id: 2, name: '', age: -5, email: 'invalid-email' }, // Invalid
    { id: 3, name: 'Another User', age: 30, email: 'valid@test.com' },
    { id: 'invalid', name: 'Bad ID', age: 15, email: 'test@test.org' }, // Invalid ID type
  ];

  const validationSchema = {
    id: (value: any) => typeof value === 'number' && value > 0,
    name: (value: any) => typeof value === 'string' && value.trim().length > 0,
    age: (value: any) =>
      typeof value === 'number' && value >= 0 && value <= 120,
    email: (value: any) =>
      typeof value === 'string' && value.includes('@') && value.includes('.'),
  };

  console.log('Test Data:');
  console.table(testData);

  console.log('\nValidation Results:');
  const validation = EnhancedTable.validateTable(testData, validationSchema);
  console.log(validation.summary);

  // Demo 4: Phone Profile Table
  console.log('\n📱 PHONE PROFILE DEMO');
  console.log('='.repeat(50));

  const phoneProfiles = [
    {
      id: 'abc123def456789',
      name: 'iPhone 14 Pro',
      deviceId: 'ios-device-001',
      phoneNumbers: ['+1-555-0123', '+1-555-0456'],
      emails: ['user@icloud.com', 'work@company.com'],
      apps: 156,
      lastSync: new Date('2024-01-15T10:30:00Z'),
    },
    {
      id: 'xyz789uvw456123',
      name: 'Samsung Galaxy S23',
      deviceId: 'android-device-002',
      phoneNumbers: ['+1-555-0789'],
      emails: ['android@gmail.com'],
      apps: 234,
      lastSync: new Date('2024-01-14T15:45:00Z'),
    },
    {
      id: 'pqr456stu789012',
      name: 'Google Pixel 7',
      deviceId: 'android-device-003',
      phoneNumbers: ['+1-555-0234', '+1-555-0567', '+1-555-0890'],
      emails: ['pixel@gmail.com'],
      apps: 189,
      lastSync: new Date('2024-01-13T09:15:00Z'),
    },
  ];

  console.log('Phone Profile Summary:');
  console.log(EnhancedTable.phoneProfileTable(phoneProfiles));

  // Demo 5: Object to Rows Conversion
  console.log('\n🔄 OBJECT TO ROWS DEMO');
  console.log('='.repeat(50));

  const objectData = {
    names: ['Alice', 'Bob', 'Charlie'],
    ages: [25, 30, 35],
    cities: ['NYC', 'LA', 'Chicago'],
    active: [true, false, true],
  };

  console.log('Original Object:');
  console.log(objectData);

  // Convert to rows using internal method (access via type assertion for demo)
  const rows = (EnhancedTable as any).objectToRows(objectData);
  console.log('\nConverted to Rows:');
  console.table(rows);

  console.log('\n🎉 EnhancedTable Demo Complete!');
  console.log('\nKey Features Demonstrated:');
  console.log('✅ Deep table comparison with diff visualization');
  console.log('✅ HTML-safe table generation for web reports');
  console.log('✅ Data validation with detailed error reporting');
  console.log('✅ Phone profile data visualization');
  console.log('✅ Object-to-rows conversion');
  console.log('✅ Color-coded output and formatting');
}

// Export for use in other modules
export { EnhancedTable };
