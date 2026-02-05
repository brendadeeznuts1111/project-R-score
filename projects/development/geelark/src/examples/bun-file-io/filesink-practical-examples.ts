#!/usr/bin/env bun

/**
 * Bun FileSink - Practical Examples
 *
 * Real-world use cases for Bun's incremental file writing API
 * including log files, data export, and streaming scenarios.
 */


// Example 1: Application logging system
class Logger {
  private writer: any;
  private logFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
    this.writer = Bun.file(logFile).writer({
      highWaterMark: 64 * 1024 // 64KB buffer
    });
  }

  log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    this.writer.write(JSON.stringify(logEntry) + '\n');

    // Flush immediately for ERROR logs
    if (level === 'ERROR') {
      this.writer.flush();
    }
  }

  info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  debug(message: string, data?: any) {
    this.log('DEBUG', message, data);
  }

  close() {
    this.writer.end();
  }
}

async function loggingExample() {
  console.log('📝 Application Logging System');

  const logger = new Logger('./output/application.log');

  try {
    logger.info('Application started', { version: '1.0.0', node: process.version });
    logger.debug('Loading configuration');
    logger.info('Database connected', { host: 'localhost', port: 5432 });
    logger.warn('High memory usage detected', { memory: '85%' });
    logger.error('Failed to process user request', { userId: 12345, error: 'Timeout' });
    logger.info('Retrying operation');
    logger.info('Operation completed successfully');

    logger.close();
    console.log('✅ Logging example completed');

  } catch (error) {
    console.error('❌ Logging error:', error);
    logger.close();
  }
}

// Example 2: CSV data export
async function csvDataExport() {
  console.log('\n📊 CSV Data Export');

  const file = Bun.file('./output/data-export.csv');
  const writer = file.writer({ highWaterMark: 128 * 1024 }); // 128KB buffer

  try {
    // Write CSV header
    const headers = ['ID', 'Name', 'Email', 'Department', 'Salary', 'JoinDate'];
    writer.write(headers.join(',') + '\n');

    // Generate sample data
    const departments = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'];
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];

    console.log('🔄 Generating 10,000 records...');

    for (let i = 1; i <= 10000; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const department = departments[Math.floor(Math.random() * departments.length)];
      const salary = 50000 + Math.floor(Math.random() * 100000);
      const joinDate = new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);

      const row = [
        i,
        `"${firstName} ${lastName}"`,
        `"${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com"`,
        department,
        salary,
        joinDate.toISOString().split('T')[0]
      ];

      writer.write(row.join(',') + '\n');

      // Progress indicator
      if (i % 2000 === 0) {
        console.log(`📈 Exported ${i} records...`);
        writer.flush();
      }
    }

    writer.end();
    console.log('✅ CSV export completed');

  } catch (error) {
    console.error('❌ CSV export error:', error);
    writer.end();
  }
}

// Example 3: JSON streaming export
async function jsonStreamingExport() {
  console.log('\n🔄 JSON Streaming Export');

  const file = Bun.file('./output/large-dataset.jsonl');
  const writer = file.writer({ highWaterMark: 256 * 1024 }); // 256KB buffer

  try {
    console.log('🔄 Streaming JSON dataset...');

    // Start JSON array
    writer.write('[\n');

    const items = [];
    for (let i = 0; i < 5000; i++) {
      const item = {
        id: i + 1,
        name: `Item ${i + 1}`,
        category: ['Electronics', 'Clothing', 'Books', 'Home', 'Sports'][Math.floor(Math.random() * 5)],
        price: (Math.random() * 1000).toFixed(2),
        inStock: Math.random() > 0.2,
        tags: Array.from({ length: Math.floor(Math.random() * 5) + 1 }, (_, j) => `tag${j + 1}`),
        metadata: {
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
          version: '1.0'
        }
      };

      items.push(item);

      // Write in batches
      if (items.length === 100 || i === 4999) {
        const batch = items.map(item => JSON.stringify(item, null, 2)).join(',\n');
        writer.write(batch);
        if (i < 4999) {
          writer.write(',\n');
        }
        items.length = 0; // Clear array

        console.log(`📦 Processed ${Math.min(i + 1, 5000)} items...`);
      }
    }

    // Close JSON array
    writer.write('\n]');
    writer.end();
    console.log('✅ JSON streaming export completed');

  } catch (error) {
    console.error('❌ JSON export error:', error);
    writer.end();
  }
}

// Example 4: Backup and archiving
async function backupAndArchive() {
  console.log('\n💾 Backup and Archiving');

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = Bun.file(`./output/backup-${timestamp}.tar`);
  const writer = backupFile.writer({ highWaterMark: 1024 * 1024 }); // 1MB buffer

  try {
    // Simulate creating a backup archive
    const files = [
      { name: 'config.json', content: '{"app": "demo", "version": "1.0"}' },
      { name: 'data.csv', content: 'id,name,value\n1,test,100\n2,demo,200' },
      { name: 'readme.txt', content: 'This is a backup file.' },
      { name: 'large-data.bin', content: Buffer.alloc(1024 * 100, 0) } // 100KB of zeros
    ];

    console.log('🔄 Creating backup archive...');

    // Simple tar-like format (just for demonstration)
    let offset = 0;
    for (const file of files) {
      const header = {
        name: file.name,
        size: file.content.length,
        mode: 0o644,
        mtime: Date.now()
      };

      // Write header
      const headerData = JSON.stringify(header) + '\n';
      writer.write(headerData);
      offset += headerData.length;

      // Write file content
      writer.write(file.content);
      offset += file.content.length;

      // Write separator
      writer.write('\n---FILE-END---\n');

      console.log(`📁 Added ${file.name} (${file.content.length} bytes)`);
    }

    writer.end();
    console.log(`✅ Backup completed: backup-${timestamp}.tar`);

  } catch (error) {
    console.error('❌ Backup error:', error);
    writer.end();
  }
}

// Example 5: Real-time data collection
async function realTimeDataCollection() {
  console.log('\n📡 Real-time Data Collection');

  const file = Bun.file('./output/real-time-data.txt');
  const writer = file.writer({ highWaterMark: 32 * 1024 }); // 32KB buffer

  try {
    console.log('🔄 Simulating real-time sensor data...');

    // Simulate collecting sensor data over time
    const sensors = ['temperature', 'humidity', 'pressure', 'light', 'motion'];
    const duration = 10000; // 10 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      const timestamp = new Date().toISOString();
      const readings = sensors.map(sensor => ({
        sensor,
        value: Math.random() * 100,
        unit: sensor === 'temperature' ? '°C' : sensor === 'humidity' ? '%' : 'units'
      }));

      const dataPoint = {
        timestamp,
        readings,
        status: Math.random() > 0.95 ? 'alert' : 'normal'
      };

      writer.write(JSON.stringify(dataPoint) + '\n');

      // Flush every second
      if (Math.random() > 0.8) {
        writer.flush();
        console.log(`💾 Data flushed at ${timestamp}`);
      }

      // Simulate real-time delay
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    writer.end();
    console.log('✅ Real-time data collection completed');

  } catch (error) {
    console.error('❌ Data collection error:', error);
    writer.end();
  }
}

// Main execution
async function runPracticalExamples() {
  console.log('🚀 Bun FileSink - Practical Examples');
  console.log('=====================================\n');

  try {
    // Ensure output directory exists
    try {
      await Bun.write('./output/.gitkeep', '');
    } catch (error) {
      // Directory might already exist, that's fine
    }

    await loggingExample();
    await csvDataExport();
    await jsonStreamingExport();
    await backupAndArchive();
    await realTimeDataCollection();

    console.log('\n🎉 All practical examples completed!');
    console.log('📁 Check ./output/ directory for generated files');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (typeof Bun !== 'undefined' && process.argv[1] && process.argv[1].endsWith('filesink-practical-examples.ts')) {
  runPracticalExamples().catch(console.error);
}

export {
    Logger, backupAndArchive, csvDataExport,
    jsonStreamingExport, loggingExample, realTimeDataCollection
};
