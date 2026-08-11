/**
 * IndexedDB Cache Manager - Local data caching and offline support
 */

class IndexedDBCache {
  constructor() {
    this.dbName = 'ProjectTrackerCache';
    this.version = 1;
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores for different data types
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('logs')) {
          db.createObjectStore('logs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('userProfile')) {
          db.createObjectStore('userProfile', { keyPath: 'uid' });
        }

        if (!db.objectStoreNames.contains('metrics')) {
          db.createObjectStore('metrics', { keyPath: 'projectId' });
        }

        if (!db.objectStoreNames.contains('pendingWrites')) {
          const pendingStore = db.createObjectStore('pendingWrites', {
            keyPath: 'id',
            autoIncrement: true,
          });
          pendingStore.createIndex('timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('offlineData')) {
          db.createObjectStore('offlineData', { keyPath: 'key' });
        }
      };
    });
  }

  // Generic method to add/update data
  async store(storeName, data) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      // Add timestamp for cache management
      if (typeof data === 'object' && data !== null) {
        data._cachedAt = Date.now();
      }

      const request = store.put(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to get data
  async get(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to get all data from store
  async getAll(storeName) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Generic method to delete data
  async delete(storeName, key) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Cache project data
  async cacheProject(project) {
    return this.store('projects', {
      id: project.id,
      userId: project.userId,
      name: project.name,
      deadline: project.deadline,
      createdAt: project.createdAt,
      started: project.started,
      status: project.status,
      velocityScore: project.velocityScore,
      consistencyScore: project.consistencyScore,
      overallScore: project.overallScore,
      consecutiveLogDays: project.consecutiveLogDays,
      _cachedAt: Date.now(),
    });
  }

  // Get cached project
  async getCachedProject(projectId) {
    return this.get('projects', projectId);
  }

  // Cache project logs
  async cacheProjectLogs(projectId, logs) {
    // Store logs with project ID prefix
    const logsWithProjectId = logs.map((log) => ({
      ...log,
      projectId: projectId,
      id: `${projectId}_${log.id || Math.random().toString(36).substr(2, 9)}`,
    }));

    const transaction = this.db.transaction(['logs'], 'readwrite');
    const store = transaction.objectStore('logs');

    // Clear existing logs for this project
    const existingLogs = await this.getProjectLogs(projectId);
    for (const log of existingLogs) {
      store.delete(log.id);
    }

    // Add new logs
    for (const log of logsWithProjectId) {
      store.put(log);
    }

    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  // Get cached project logs
  async getProjectLogs(projectId) {
    const allLogs = await this.getAll('logs');
    return allLogs.filter((log) => log.projectId === projectId);
  }

  // Cache user profile
  async cacheUserProfile(userData) {
    return this.store('userProfile', {
      uid: userData.uid,
      email: userData.email,
      tier: userData.tier,
      claimedBadges: userData.claimedBadges || [],
      bonusProjects: userData.bonusProjects || 0,
      _cachedAt: Date.now(),
    });
  }

  // Get cached user profile
  async getCachedUserProfile(uid) {
    return this.get('userProfile', uid);
  }

  // Cache project metrics
  async cacheProjectMetrics(projectId, metrics) {
    return this.store('metrics', {
      projectId: projectId,
      velocity: metrics.velocity,
      consistency: metrics.consistency,
      overallScore: metrics.overallScore,
      logsCount: metrics.logsCount,
      lastUpdated: Date.now(),
      _cachedAt: Date.now(),
    });
  }

  // Get cached project metrics
  async getCachedProjectMetrics(projectId) {
    return this.get('metrics', projectId);
  }

  // Queue pending write operations for offline mode
  async queueWrite(operation, collection, docId, data) {
    return this.store('pendingWrites', {
      operation, // 'create', 'update', 'delete'
      collection,
      docId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    });
  }

  // Get all pending writes
  async getPendingWrites() {
    return this.getAll('pendingWrites');
  }

  // Remove completed pending write
  async removePendingWrite(id) {
    return this.delete('pendingWrites', id);
  }

  // Clear all cached data
  async clearCache() {
    if (!this.db) await this.init();

    const storeNames = [
      'projects',
      'logs',
      'userProfile',
      'metrics',
      'offlineData',
    ];
    const promises = storeNames.map((storeName) => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    return Promise.all(promises);
  }

  // Clean old cache entries (older than specified days)
  async cleanOldCache(maxAgeDays = 7) {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
    const cutoffTime = Date.now() - maxAge;

    const storeNames = ['projects', 'logs', 'userProfile', 'metrics'];

    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          const data = cursor.value;
          if (data._cachedAt && data._cachedAt < cutoffTime) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
    }
  }

  // Get cache statistics
  async getCacheStats() {
    const stats = {};

    const storeNames = [
      'projects',
      'logs',
      'userProfile',
      'metrics',
      'pendingWrites',
    ];

    for (const storeName of storeNames) {
      const count = await new Promise((resolve) => {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });

      stats[storeName] = count;
    }

    return stats;
  }

  // Store offline data for temporary use
  async setOfflineData(key, value) {
    return this.store('offlineData', {
      key: key,
      value: value,
      _cachedAt: Date.now(),
    });
  }

  // Get offline data
  async getOfflineData(key) {
    const result = await this.get('offlineData', key);
    return result ? result.value : null;
  }

  // Check if online and sync pending writes
  async syncPendingWrites() {
    if (!navigator.onLine) {
      return { success: false, reason: 'Offline' };
    }

    const pendingWrites = await this.getPendingWrites();
    const results = [];

    for (const write of pendingWrites) {
      try {
        // Here you would implement the actual sync logic with Firebase
        // For now, we'll just remove the write from the queue
        await this.removePendingWrite(write.id);
        results.push({ success: true, writeId: write.id });
      } catch (error) {
        // Increment retry count
        write.retryCount = (write.retryCount || 0) + 1;

        // Remove if too many retries
        if (write.retryCount > 3) {
          await this.removePendingWrite(write.id);
          results.push({
            success: false,
            writeId: write.id,
            reason: 'Max retries',
          });
        } else {
          await this.store('pendingWrites', write);
          results.push({
            success: false,
            writeId: write.id,
            reason: 'Will retry',
          });
        }
      }
    }

    return { success: true, results };
  }
}

// Export singleton instance
export const cacheManager = new IndexedDBCache();

// Initialize cache manager when module loads
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    cacheManager.syncPendingWrites().then((result) => {
      if (result.success) {
        console.log('Synced pending writes:', result.results);
      }
    });
  });

  // Clean old cache periodically
  setInterval(
    () => {
      cacheManager.cleanOldCache();
    },
    24 * 60 * 60 * 1000
  ); // Daily cleanup
}
