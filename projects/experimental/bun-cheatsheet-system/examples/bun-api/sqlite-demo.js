#!/usr/bin/env bun

export async function demoSQLite() {
  console.info('🗄️ Bun SQLite Demo');
  console.info('='.repeat(40));
  
  // Create a temporary database
  const dbPath = './temp-demo.db';
  
  try {
    // 1. Create database connection
    console.info('\n1. 🔗 Creating database connection:');
    const db = new Bun.Database(dbPath);
    console.info('   ✅ Database connected');
    
    // 2. Create tables
    console.info('\n2. 📋 Creating tables:');
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    `);
    console.info('   ✅ Tables created');
    
    // 3. Insert data with parameters
    console.info('\n3. 📝 Inserting data:');
    const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
    
    const users = [
      ['Alice Johnson', 'alice@example.com'],
      ['Bob Smith', 'bob@example.com'],
      ['Charlie Brown', 'charlie@example.com']
    ];
    
    users.forEach(user => {
      insertUser.run(user);
    });
    console.info(`   ✅ Inserted ${users.length} users`);
    
    // 4. Insert posts
    const insertPost = db.prepare('INSERT INTO posts (user_id, title, content, published) VALUES (?, ?, ?, ?)');
    
    const posts = [
      [1, 'First Post', 'This is my first post content', true],
      [1, 'Second Post', 'Another post from Alice', false],
      [2, 'Hello World', 'Bob says hello!', true],
      [3, 'Charlie\'s Thoughts', 'Some deep thoughts here', true]
    ];
    
    posts.forEach(post => {
      insertPost.run(post);
    });
    console.info(`   ✅ Inserted ${posts.length} posts`);
    
    // 5. Query with SELECT
    console.info('\n5. 🔍 Querying data:');
    const allUsers = db.query('SELECT * FROM users').all();
    console.info('   👥 All users:');
    allUsers.forEach(user => {
      console.info(`      - ${user.name} (${user.email})`);
    });
    
    // 6. Query with JOIN
    console.info('\n6. 🔗 Query with JOIN:');
    const userPosts = db.query(`
      SELECT u.name, p.title, p.published 
      FROM users u 
      JOIN posts p ON u.id = p.user_id 
      ORDER BY u.name, p.created_at
    `).all();
    
    console.info('   📄 User posts:');
    userPosts.forEach(post => {
      const status = post.published ? '✅ Published' : '📝 Draft';
      console.info(`      - ${post.name}: "${post.title}" ${status}`);
    });
    
    // 7. Query with parameters
    console.info('\n7. 🎯 Parameterized query:');
    const publishedPosts = db.query('SELECT * FROM posts WHERE published = ?').all(true);
    console.info(`   📰 Published posts (${publishedPosts.length}):`);
    publishedPosts.forEach(post => {
      console.info(`      - ${post.title}`);
    });
    
    // 8. Aggregate functions
    console.info('\n8. 📊 Aggregate functions:');
    const stats = db.query(`
      SELECT 
        COUNT(*) as total_users,
        (SELECT COUNT(*) FROM posts) as total_posts,
        (SELECT COUNT(*) FROM posts WHERE published = true) as published_posts
    `).get();
    
    console.info(`   👥 Total users: ${stats.total_users}`);
    console.info(`   📄 Total posts: ${stats.total_posts}`);
    console.info(`   ✅ Published posts: ${stats.published_posts}`);
    
    // 9. Prepared statements for performance
    console.info('\n9. ⚡ Prepared statements:');
    const getUserPosts = db.prepare(`
      SELECT title, content, created_at 
      FROM posts 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `);
    
    const alicePosts = getUserPosts.all(1);
    console.info(`   📝 Alice's posts (${alicePosts.length}):`);
    alicePosts.forEach(post => {
      console.info(`      - ${post.title} (${new Date(post.created_at).toLocaleDateString()})`);
    });
    
    // 10. Transactions
    console.info('\n10. 🔄 Transactions:');
    const transaction = db.transaction(() => {
      // Add a new user
      const result = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)').run('David Wilson', 'david@example.com');
      const userId = result.lastInsertRowid;
      
      // Add multiple posts for this user
      db.prepare('INSERT INTO posts (user_id, title, content, published) VALUES (?, ?, ?, ?)').run(userId, 'David\'s First Post', 'Content here', true);
      db.prepare('INSERT INTO posts (user_id, title, content, published) VALUES (?, ?, ?, ?)').run(userId, 'David\'s Second Post', 'More content', false);
      
      return userId;
    });
    
    const newUserId = transaction();
    console.info(`   ✅ Transaction completed. New user ID: ${newUserId}`);
    
    // 11. Update and delete
    console.info('\n11. ✏️ Update and delete:');
    // Update a post
    db.prepare('UPDATE posts SET published = true WHERE user_id = ? AND published = false').run(newUserId);
    console.info('   ✅ Updated David\'s draft posts to published');
    
    // Delete a user (and their posts will be deleted due to foreign key if we set it up that way)
    const deleted = db.prepare('DELETE FROM users WHERE name = ?').run('Charlie Brown');
    console.info(`   🗑️ Deleted ${deleted.changes} user(s)`);
    
    // 12. Final verification
    console.info('\n12. ✅ Final verification:');
    const finalStats = db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM posts) as posts,
        (SELECT COUNT(*) FROM posts WHERE published = true) as published
    `).get();
    
    console.info(`   📊 Final stats: ${finalStats.users} users, ${finalStats.posts} posts, ${finalStats.published} published`);
    
    // Close database
    db.close();
    console.info('\n✅ Database connection closed');
    
  } catch (error) {
    console.info(`❌ Error: ${error.message}`);
  } finally {
    // Clean up
    try {
      await Bun.file(dbPath).delete();
      console.info('🧹 Database file cleaned up');
    } catch (e) {
      // Ignore cleanup errors
    }
  }
  
  console.info('\n✅ SQLite demo completed!');
  console.info('\n💡 SQLite features demonstrated:');
  console.info('   • Database creation and connection');
  console.info('   • Table creation with foreign keys');
  console.info('   • Parameterized queries for security');
  console.info('   • JOIN operations');
  console.info('   • Aggregate functions');
  console.info('   • Prepared statements for performance');
  console.info('   • Transactions for data consistency');
  console.info('   • CRUD operations (Create, Read, Update, Delete)');
}

if (import.meta.main) {
  demoSQLite();
}
