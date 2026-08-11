/**
 * Database Optimization - Firebase query optimization and indexing strategies
 */

import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase.js';

class DatabaseOptimizer {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.batchSize = 20;
  }

  // Optimized query with caching and pagination
  async optimizedQuery(collectionRef, queries = [], options = {}) {
    const {
      useCache = true,
      pageSize = this.batchSize,
      lastDocument = null,
      orderByField = 'createdAt',
      orderDirection = 'desc',
    } = options;

    // Create cache key
    const cacheKey = this.generateCacheKey(
      collectionRef.path,
      queries,
      options
    );

    // Check cache first
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }
    }

    // Build query with optimization
    let q = query(collectionRef, ...queries);

    // Add ordering
    q = query(q, orderBy(orderByField, orderDirection));

    // Add pagination
    if (lastDocument) {
      q = query(q, startAfter(lastDocument));
    }

    // Limit page size
    q = query(q, limit(pageSize));

    try {
      const snapshot = await getDocs(q);
      const documents = [];
      let lastVisible = null;

      snapshot.forEach((doc) => {
        documents.push({
          id: doc.id,
          ...doc.data(),
        });
        lastVisible = doc;
      });

      const result = {
        documents,
        lastVisible,
        hasMore: documents.length === pageSize,
      };

      // Cache the result
      if (useCache) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (error) {
      console.error('Optimized query failed:', error);
      throw error;
    }
  }

  // Generate cache key for queries
  generateCacheKey(collectionPath, queries, options) {
    const queryString = queries
      .map((q) => `${Object.keys(q)[0]}_${Object.values(q)[0]}`)
      .join('_');
    const optionsString = JSON.stringify({
      pageSize: options.pageSize,
      orderByField: options.orderByField,
      orderDirection: options.orderDirection,
    });
    return `${collectionPath}_${queryString}_${optionsString}`;
  }

  // Batch operations for better performance
  async batchWrite(operations) {
    const batch = db.batch();
    const results = [];

    operations.forEach((op) => {
      const { type, ref, data } = op;

      switch (type) {
        case 'create':
          batch.set(ref, {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          break;
        case 'update':
          batch.update(ref, { ...data, updatedAt: serverTimestamp() });
          break;
        case 'delete':
          batch.delete(ref);
          break;
      }

      results.push({ type, ref: ref.path });
    });

    try {
      await batch.commit();
      console.log(`Batch write completed: ${results.length} operations`);
      return results;
    } catch (error) {
      console.error('Batch write failed:', error);
      throw error;
    }
  }

  // Optimized user projects fetch with indexing
  async getUserProjectsOptimized(userId, options = {}) {
    const { pageSize = 20, lastDoc = null, status = null } = options;

    const userProjectsRef = collection(db, 'users', userId, 'projects');
    const queries = [];

    if (status) {
      queries.push(where('status', '==', status));
    }

    return this.optimizedQuery(userProjectsRef, queries, {
      pageSize,
      lastDocument: lastDoc,
      orderByField: 'updatedAt',
      orderDirection: 'desc',
    });
  }

  // Optimized logs fetching with compound queries
  async getProjectLogsOptimized(userId, projectId, options = {}) {
    const { pageSize = 50, lastDoc = null, dateRange = null } = options;

    const logsRef = collection(
      db,
      'users',
      userId,
      'projects',
      projectId,
      'logs'
    );
    const queries = [];

    if (dateRange) {
      queries.push(where('createdAt', '>=', dateRange.start));
      queries.push(where('createdAt', '<=', dateRange.end));
    }

    return this.optimizedQuery(logsRef, queries, {
      pageSize,
      lastDocument: lastDoc,
      orderByField: 'createdAt',
      orderDirection: 'desc',
    });
  }

  // Real-time listener optimization
  createOptimizedListener(collectionRef, queries = [], callback, options = {}) {
    const { debounceMs = 500, maxRetries = 3, retryDelay = 1000 } = options;

    let retryCount = 0;
    let lastCallbackData = null;
    let timeoutId = null;

    const unsubscribes = [];

    const setupListener = () => {
      const q = query(collectionRef, ...queries);

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          retryCount = 0; // Reset retry count on success

          const documents = [];
          snapshot.forEach((doc) => {
            documents.push({
              id: doc.id,
              ...doc.data(),
            });
          });

          // Debounce callback to prevent rapid updates
          if (timeoutId) {
            clearTimeout(timeoutId);
          }

          timeoutId = setTimeout(() => {
            const callbackData = {
              documents,
              source: snapshot.metadata.fromCache ? 'cache' : 'server',
            };

            // Only call callback if data actually changed
            if (
              JSON.stringify(callbackData) !== JSON.stringify(lastCallbackData)
            ) {
              callback(callbackData);
              lastCallbackData = callbackData;
            }
          }, debounceMs);
        },
        (error) => {
          console.error('Real-time listener error:', error);

          // Retry logic
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Retrying listener (${retryCount}/${maxRetries})...`);
            setTimeout(setupListener, retryDelay * retryCount);
          } else {
            console.error('Max retries reached, listener failed');
            if (options.onError) {
              options.onError(error);
            }
          }
        }
      );

      unsubscribes.push(unsubscribe);
    };

    setupListener();

    // Return unsubscribe function
    return () => {
      unsubscribes.forEach((unsubscribe) => unsubscribe());
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }

  // Data cleanup utilities
  async cleanupOldData(userId, maxAge = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAge);

    const userProjectsRef = collection(db, 'users', userId, 'projects');
    const oldProjectsQuery = query(
      userProjectsRef,
      where('updatedAt', '<', cutoffDate),
      where('status', '==', 'completed')
    );

    try {
      const snapshot = await getDocs(oldProjectsQuery);
      const cleanupPromises = [];

      snapshot.forEach((doc) => {
        cleanupPromises.push(this.cleanupProjectData(userId, doc.id));
      });

      await Promise.all(cleanupPromises);
      console.log(`Cleaned up ${cleanupPromises.length} old projects`);
      return cleanupPromises.length;
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  }

  // Cleanup individual project data
  async cleanupProjectData(userId, projectId) {
    const operations = [];

    // Delete old logs (keep only last 100)
    const logsRef = collection(
      db,
      'users',
      userId,
      'projects',
      projectId,
      'logs'
    );
    const allLogsQuery = query(logsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(allLogsQuery);

    const logs = snapshot.docs;
    if (logs.length > 100) {
      // Delete oldest logs
      for (let i = 100; i < logs.length; i++) {
        operations.push({
          type: 'delete',
          ref: logs[i].ref,
        });
      }
    }

    // Execute batch if there are operations
    if (operations.length > 0) {
      await this.batchWrite(operations);
    }

    return operations.length;
  }

  // Index recommendation system
  analyzeQueryPerformance() {
    const recommendations = [];

    // Check for common slow query patterns
    const slowPatterns = [
      {
        pattern: 'Multiple where clauses without proper indexing',
        solution: 'Create composite indexes for multi-field queries',
      },
      {
        pattern: 'Ordering on non-indexed fields',
        solution: 'Add indexes for fields used in orderBy',
      },
      {
        pattern: 'Large collection queries without pagination',
        solution: 'Implement pagination with limit() and startAfter()',
      },
    ];

    // Analyze current query patterns
    this.cache.forEach((value, key) => {
      if (key.includes('orderBy') && !key.includes('createdAt')) {
        recommendations.push({
          type: 'index',
          collection: key.split('_')[0],
          fields: key.match(/orderBy_([^_]+)/)?.[1],
          reason: 'Ordering field should be indexed',
        });
      }
    });

    return {
      recommendations,
      slowPatterns,
      cacheSize: this.cache.size,
      cacheHitRate: this.calculateCacheHitRate(),
    };
  }

  // Calculate cache hit rate
  calculateCacheHitRate() {
    let hits = 0;
    let misses = 0;

    this.cache.forEach((value) => {
      // This is a simplified calculation
      if (Date.now() - value.timestamp < this.cacheTimeout / 2) {
        hits++;
      } else {
        misses++;
      }
    });

    return hits / (hits + misses) || 0;
  }

  // Clear cache
  clearCache() {
    this.cache.clear();
    console.log('Database cache cleared');
  }

  // Preload critical data
  async preloadCriticalData(userId) {
    try {
      // Preload user projects
      await this.getUserProjectsOptimized(userId, { pageSize: 10 });

      // Preload recent projects for quick access
      const recentProjects = await this.getUserProjectsOptimized(userId, {
        pageSize: 5,
      });

      // Preload logs for recent projects
      const logPromises = recentProjects.documents
        .slice(0, 3)
        .map((project) =>
          this.getProjectLogsOptimized(userId, project.id, { pageSize: 20 })
        );

      await Promise.all(logPromises);
      console.log('Critical data preloaded successfully');
    } catch (error) {
      console.error('Failed to preload critical data:', error);
    }
  }
}

// Pagination helper
export class PaginationHelper {
  static createPaginationControls(container, options = {}) {
    const {
      currentPage = 1,
      totalPages = 1,
      onPageChange,
      showFirstLast = true,
      maxVisiblePages = 5,
    } = options;

    const controls = document.createElement('div');
    controls.className = 'pagination-controls';

    let html = '';

    // First button
    if (showFirstLast && currentPage > 1) {
      html += `<button class="pagination-btn" data-page="1">First</button>`;
    }

    // Previous button
    if (currentPage > 1) {
      html += `<button class="pagination-btn" data-page="${currentPage - 1}">Previous</button>`;
    }

    // Page numbers
    const startPage = Math.max(
      1,
      currentPage - Math.floor(maxVisiblePages / 2)
    );
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    for (let i = startPage; i <= endPage; i++) {
      const activeClass = i === currentPage ? 'active' : '';
      html += `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`;
    }

    // Next button
    if (currentPage < totalPages) {
      html += `<button class="pagination-btn" data-page="${currentPage + 1}">Next</button>`;
    }

    // Last button
    if (showFirstLast && currentPage < totalPages) {
      html += `<button class="pagination-btn" data-page="${totalPages}">Last</button>`;
    }

    controls.innerHTML = html;

    // Add event listeners
    controls.addEventListener('click', (e) => {
      if (e.target.classList.contains('pagination-btn')) {
        const page = parseInt(e.target.dataset.page);
        if (onPageChange) {
          onPageChange(page);
        }
      }
    });

    container.innerHTML = '';
    container.appendChild(controls);

    return controls;
  }
}

// Export singleton instance
export const dbOptimizer = new DatabaseOptimizer();

// Initialize database optimizer
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    dbOptimizer.clearCache();
    console.log('Database cache cleared due to network reconnection');
  });
}
