import React, { useState, useEffect } from 'react';

interface SearchIndex {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  score: number;
}

export function useBunSearch() {
  const [searchIndex, setSearchIndex] = useState<SearchIndex[]>([]);
  const [isIndexing, setIsIndexing] = useState(false);

  const buildIndex = async (documents: any[]) => {
    setIsIndexing(true);
    try {
      // Simulate Bun-powered search indexing
      // In real Bun, you'd use Bun's fast string processing and SQLite
      const index: SearchIndex[] = documents.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: `${doc.title} ${doc.description} ${doc.tags?.join(' ')}`,
        category: doc.category,
        tags: doc.tags || [],
        score: 0
      }));

      // Simulate TF-IDF scoring
      index.forEach(item => {
        const words = item.content.toLowerCase().split(/\s+/);
        const wordCount = words.length;
        item.score = wordCount * (item.popular ? 1.5 : 1) * (item.new ? 1.2 : 1);
      });

      setSearchIndex(index);
    } catch (error) {
      console.error('Failed to build search index:', error);
    } finally {
      setIsIndexing(false);
    }
  };

  const search = async (query: string): Promise<SearchIndex[]> => {
    if (!query.trim()) return [];

    try {
      // Simulate Bun's fast search capabilities
      // In real Bun, you'd use SQLite FTS or custom indexing
      const results = searchIndex
        .filter(item => 
          item.content.toLowerCase().includes(query.toLowerCase()) ||
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.category.toLowerCase().includes(query.toLowerCase()) ||
          item.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
        )
        .map(item => {
          const queryLower = query.toLowerCase();
          const titleMatch = item.title.toLowerCase().includes(queryLower);
          const contentMatch = item.content.toLowerCase().includes(queryLower);
          const categoryMatch = item.category.toLowerCase().includes(queryLower);
          const tagMatch = item.tags.some(tag => tag.toLowerCase().includes(queryLower));

          let score = item.score;
          if (titleMatch) score *= 3;
          if (contentMatch) score *= 2;
          if (categoryMatch) score *= 1.5;
          if (tagMatch) score *= 1.2;

          return { ...item, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return results;
    } catch (error) {
      console.error('Search failed:', error);
      return [];
    }
  };

  const addToIndex = async (document: any) => {
    try {
      const newItem: SearchIndex = {
        id: document.id,
        title: document.title,
        content: `${document.title} ${document.description} ${document.tags?.join(' ')}`,
        category: document.category,
        tags: document.tags || [],
        score: document.popular ? 1.5 : 1
      };

      setSearchIndex(prev => [...prev, newItem]);
    } catch (error) {
      console.error('Failed to add to index:', error);
    }
  };

  const removeFromIndex = async (id: string) => {
    try {
      setSearchIndex(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('Failed to remove from index:', error);
    }
  };

  return {
    searchIndex,
    isIndexing,
    buildIndex,
    search,
    addToIndex,
    removeFromIndex
  };
}
