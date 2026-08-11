import { describe, it, expect, vi } from 'vitest'';
import {
  lazyLoadComponent,
  preloadImages,
  lazyLoadScripts,
  lazyLoadStyles,
  monitorLoadingPerformance,
} from '../lazy-loader.js';

describe('Lazy Loader Module', () => {
  describe('lazyLoadComponent', () => {
    it('should lazy load component successfully', async () => {
      const mockComponent = {
        name: 'DashboardComponent',
        importPath: './components/Dashboard.js',
        selector: 'dashboard-component',
        dependencies: ['chart.js']
      };

      vi.mocked(import).mockResolvedValue({ default: vi.fn() });

      await lazyLoadComponent(mockComponent);

      expect(import).toHaveBeenCalledWith('./components/Dashboard.js');
    });

    it('should handle lazy load error', async () => {
      const mockComponent = {
        name: 'DashboardComponent',
        importPath: './components/Dashboard.js',
        selector: 'dashboard-component'
      };

      vi.mocked(import).mockRejectedValue(new Error('Import failed'));

      await expect(lazyLoadComponent(mockComponent)).rejects.toThrow('Import failed');
    });
  });

  describe('preloadImages', () => {
    it('should preload images successfully', async () => {
      const mockImageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ];

      vi.mocked(Image).mockImplementation(() => ({
        src: '',
        onload: vi.fn(),
        onerror: vi.fn()
      }));

      await preloadImages(mockImageUrls);

      expect(Image).toHaveBeenCalledTimes(2);
    });
  });

  describe('lazyLoadScripts', () => {
    it('should lazy load scripts successfully', async () => {
      const mockScriptUrls = [
        'https://cdn.example.com/library.js',
        'https://cdn.example.com/plugin.js'
      ];

      vi.mocked(document.createElement).mockReturnValue({
        src: '',
        async: true,
        onload: vi.fn(),
        onerror: vi.fn()
      });

      await lazyLoadScripts(mockScriptUrls);

      expect(document.createElement).toHaveBeenCalledWith('script');
    });
  });

  describe('lazyLoadStyles', () => {
    it('should lazy load styles successfully', async () => {
      const mockStyleUrls = [
        'https://cdn.example.com/theme.css',
        'https://cdn.example.com/dark-mode.css'
      ];

      vi.mocked(document.createElement).mockReturnValue({
        href: '',
        rel: 'stylesheet',
        onload: vi.fn(),
        onerror: vi.fn()
      });

      await lazyLoadStyles(mockStyleUrls);

      expect(document.createElement).toHaveBeenCalledWith('link');
    });
  });

  describe('monitorLoadingPerformance', () => {
    it('should monitor loading performance successfully', async () => {
      const mockMetrics = {
        componentsLoaded: 5,
        imagesLoaded: 10,
        scriptsLoaded: 3,
        stylesLoaded: 2,
        totalLoadTime: 2500,
        memoryUsage: 200
      };

      vi.mocked(addDoc).mockResolvedValue({ id: 'metric1' });

      await monitorLoadingPerformance(mockMetrics);

      expect(addDoc).toHaveBeenCalledWith(
        collection(db, 'loadingMetrics'),
        {
          componentsLoaded: 5,
          imagesLoaded: 10,
          scriptsLoaded: 3,
          stylesLoaded: 2,
          totalLoadTime: 2500,
          memoryUsage: 200,
          timestamp: vi.anything()
        }
      );
    });
  });
});