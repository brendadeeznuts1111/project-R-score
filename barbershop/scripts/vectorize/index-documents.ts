#!/usr/bin/env bun
/**
 * Script to index knowledge base documents in Vectorize
 * Chunks documents and creates embeddings for RAG support
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { vectorizeClient } from '../../src/core/vectorize-client';

const DOCS_DIR = join(process.cwd(), 'docs/knowledge-base');
const CHUNK_SIZE = 800; // Characters per chunk
const OVERLAP = 100; // Overlap between chunks

interface DocumentChunk {
  id: string;
  content: string;
  docId: string;
  section: string;
  topic: string;
}

/**
 * Split text into overlapping chunks
 */
function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
  }

  return chunks;
}

/**
 * Extract section and topic from markdown content
 */
function parseMarkdown(content: string, filename: string): { sections: Array<{ title: string; content: string }>; topic: string } {
  const lines = content.split('\n');
  const sections: Array<{ title: string; content: string }> = [];
  let currentSection = { title: 'Introduction', content: '' };
  let topic = filename.replace('.md', '').replace(/-/g, ' ');

  for (const line of lines) {
    if (line.startsWith('# ')) {
      // Main title - use as topic
      topic = line.replace('# ', '').trim();
    } else if (line.startsWith('## ')) {
      // Save previous section
      if (currentSection.content.trim()) {
        sections.push(currentSection);
      }
      // Start new section
      currentSection = {
        title: line.replace('## ', '').trim(),
        content: '',
      };
    } else {
      currentSection.content += line + '\n';
    }
  }

  // Add last section
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }

  return { sections, topic };
}

/**
 * Process a markdown file and create chunks
 */
async function processDocument(filepath: string, filename: string): Promise<DocumentChunk[]> {
  const content = await readFile(filepath, 'utf-8');
  const { sections, topic } = parseMarkdown(content, filename);
  const chunks: DocumentChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionChunks = chunkText(section.content, CHUNK_SIZE, OVERLAP);

    for (let i = 0; i < sectionChunks.length; i++) {
      chunks.push({
        id: `doc-${filename}-${chunkIndex++}`,
        content: sectionChunks[i],
        docId: filename,
        section: section.title,
        topic,
      });
    }
  }

  return chunks;
}

async function indexDocuments() {
  console.log('📚 Indexing knowledge base documents...\n');

  // Check if Vectorize is available
  const available = await vectorizeClient.isAvailable();
  if (!available) {
    console.error('❌ Vectorize is not available. Please:');
    console.error('   1. Deploy the Cloudflare Worker: npx wrangler deploy');
    console.error('   2. Set VECTORIZE_WORKER_URL environment variable');
    console.error('   3. Set VECTORIZE_ENABLED=true');
    process.exit(1);
  }

  try {
    // Read all markdown files
    const files = await readdir(DOCS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    console.log(`Found ${mdFiles.length} documents to index\n`);

    if (mdFiles.length === 0) {
      console.log('No documents to index.');
      return;
    }

    // Process all documents
    const allChunks: DocumentChunk[] = [];

    for (const file of mdFiles) {
      const filepath = join(DOCS_DIR, file);
      console.log(`Processing ${file}...`);
      
      const chunks = await processDocument(filepath, file);
      allChunks.push(...chunks);
      console.log(`  ✅ Created ${chunks.length} chunks`);
    }

    console.log(`\nTotal chunks: ${allChunks.length}\n`);
    console.log('Indexing chunks in Vectorize...\n');

    // Index all chunks
    const result = await vectorizeClient.indexDocuments(allChunks);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully indexed ${allChunks.length} document chunks`);
    console.log(`   Mutation ID: ${result.mutationId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('Note: V2 mutations are async. Vectors may take a few seconds to be queryable.');
    console.log('Check mutation status with: npx wrangler vectorize describe barbershop-docs-index\n');
  } catch (error: any) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run indexing
indexDocuments().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
