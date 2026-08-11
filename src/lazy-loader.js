/**
 * Lazy Loading Utilities - Dynamic imports and performance optimization
 */

class LazyLoader {
  constructor() {
    this.loadedModules = new Map();
    this.loadingPromises = new Map();
    this.observerOptions = {
      root: null,
      rootMargin: '50px',
      threshold: 0.1,
    };
  }

  // Dynamic import with caching
  async loadModule(modulePath, moduleKey = modulePath) {
    // Return cached module if already loaded
    if (this.loadedModules.has(moduleKey)) {
      return this.loadedModules.get(moduleKey);
    }

    // Return existing promise if currently loading
    if (this.loadingPromises.has(moduleKey)) {
      return this.loadingPromises.get(moduleKey);
    }

    // Start loading the module
    const loadingPromise = import(modulePath)
      .then((module) => {
        this.loadedModules.set(moduleKey, module);
        this.loadingPromises.delete(moduleKey);
        return module;
      })
      .catch((error) => {
        this.loadingPromises.delete(moduleKey);
        console.error(`Failed to load module ${modulePath}:`, error);
        throw error;
      });

    this.loadingPromises.set(moduleKey, loadingPromise);
    return loadingPromise;
  }

  // Lazy load Chart.js with custom configuration
  async loadChart() {
    const chartModule = await this.loadModule('chart.js/auto', 'chart');

    // Configure Chart.js defaults for performance
    if (chartModule.Chart) {
      chartModule.Chart.defaults.font.family = 'Inter, system-ui, sans-serif';
      chartModule.Chart.defaults.plugins.legend.labels.boxWidth = 12;
      chartModule.Chart.defaults.plugins.legend.labels.padding = 15;
      chartModule.Chart.defaults.responsive = true;
      chartModule.Chart.defaults.maintainAspectRatio = false;
    }

    return chartModule;
  }

  // Lazy load PDF generation utilities
  async loadPDFUtils() {
    return this.loadModule('jspdf', 'jspdf');
  }

  // Lazy load HTML to canvas conversion
  async loadHTML2Canvas() {
    return this.loadModule('html2canvas', 'html2canvas');
  }

  // Preload critical modules
  async preloadCriticalModules() {
    const criticalModules = [{ path: 'chart.js/auto', key: 'chart' }];

    const preloadPromises = criticalModules.map((module) =>
      this.loadModule(module.path, module.key).catch((error) => {
        console.warn(`Failed to preload ${module.key}:`, error);
      })
    );

    return Promise.allSettled(preloadPromises);
  }

  // Intersection Observer for lazy loading elements
  createIntersectionObserver(callback, options = {}) {
    const observerOptions = { ...this.observerOptions, ...options };

    return new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
  }

  // Lazy load images
  lazyLoadImages(container = document) {
    const images = container.querySelectorAll('img[data-src]');

    if ('IntersectionObserver' in window) {
      const imageObserver = this.createIntersectionObserver((entry) => {
        const img = entry.target;
        const src = img.dataset.src;

        if (src) {
          img.src = src;
          img.classList.add('loaded');
          img.removeAttribute('data-src');
        }
      });

      images.forEach((img) => imageObserver.observe(img));
    } else {
      // Fallback for older browsers
      images.forEach((img) => {
        const src = img.dataset.src;
        if (src) {
          img.src = src;
          img.classList.add('loaded');
        }
      });
    }
  }

  // Lazy load components
  async loadComponent(componentPath, container, props = {}) {
    try {
      const module = await this.loadModule(componentPath);
      const Component = module.default || module[Object.keys(module)[0]];

      if (typeof Component === 'function') {
        const element = Component(props);
        if (container) {
          container.innerHTML = '';
          container.appendChild(element);
        }
        return element;
      }
    } catch (error) {
      console.error(`Failed to load component ${componentPath}:`, error);
      throw error;
    }
  }

  // Lazy load heavy sections with skeleton screens
  lazyLoadSection(sectionSelector, loaderFunction) {
    const sections = document.querySelectorAll(sectionSelector);

    const sectionObserver = this.createIntersectionObserver(async (entry) => {
      const section = entry.target;

      // Show loading state
      section.classList.add('loading');
      section.innerHTML = this.createSkeletonLoader();

      try {
        await loaderFunction(section);
        section.classList.remove('loading');
        section.classList.add('loaded');
      } catch (error) {
        console.error('Failed to load section:', error);
        section.classList.remove('loading');
        section.classList.add('error');
        section.innerHTML =
          '<div class="error-message">Failed to load content</div>';
      }
    });

    sections.forEach((section) => sectionObserver.observe(section));
  }

  // Create skeleton loader UI
  createSkeletonLoader() {
    return `
      <div class="skeleton-loader">
        <div class="skeleton-header"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-paragraph">
          <div class="skeleton-line"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `;
  }

  // Progressive image loading
  progressiveImageLoad(imgElement, lowQualitySrc, highQualitySrc) {
    // First load low quality image
    imgElement.src = lowQualitySrc;
    imgElement.classList.add('low-quality');

    // Then load high quality image
    const highQualityImg = new Image();
    highQualityImg.onload = () => {
      imgElement.src = highQualitySrc;
      imgElement.classList.remove('low-quality');
      imgElement.classList.add('high-quality');
    };
    highQualityImg.src = highQualitySrc;
  }

  // Lazy load analytics and tracking
  async loadAnalytics() {
    // Only load analytics if user consent is given
    if (localStorage.getItem('analytics-consent') === 'true') {
      try {
        await this.loadModule('./analytics.js', 'analytics');
        console.log('Analytics loaded successfully');
      } catch (error) {
        console.warn('Failed to load analytics:', error);
      }
    }
  }

  // Resource hints for performance
  addResourceHints() {
    const head = document.head;

    // DNS prefetch for external resources
    const dnsPrefetchDomains = [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'www.gstatic.com',
      '*.firebaseio.com',
    ];

    dnsPrefetchDomains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = `//${domain}`;
      head.appendChild(link);
    });

    // Preconnect to critical resources
    const preconnectDomains = [
      'https://fonts.googleapis.com',
      'https://fonts.gstatic.com',
      'https://www.gstatic.com',
    ];

    preconnectDomains.forEach((domain) => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      head.appendChild(link);
    });
  }

  // Preload critical resources
  preloadCriticalResources() {
    const head = document.head;

    // Preload critical CSS
    const criticalStyles = ['/enhanced-styles.css'];

    criticalStyles.forEach((href) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.onload = function () {
        this.onload = null;
        this.rel = 'stylesheet';
      };
      head.appendChild(link);
    });
  }

  // Debounced function for performance optimization
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttled function for scroll events
  throttle(func, limit) {
    let inThrottle;
    return function (...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  // Monitor and report performance metrics
  monitorPerformance() {
    // Performance Observer API
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.entryType === 'measure') {
            console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
          }
        });
      });

      observer.observe({ entryTypes: ['measure'] });
    }

    // Core Web Vitals
    this.measureCoreWebVitals();
  }

  // Measure Core Web Vitals
  measureCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay (FID)
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        console.log('FID:', entry.processingStart - entry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
          console.log('CLS:', clsValue);
        }
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }
}

// Export singleton instance
export const lazyLoader = new LazyLoader();

// Initialize lazy loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    lazyLoader.addResourceHints();
    lazyLoader.preloadCriticalResources();
    lazyLoader.lazyLoadImages();
    lazyLoader.monitorPerformance();
  });
} else {
  // DOM already loaded
  lazyLoader.addResourceHints();
  lazyLoader.preloadCriticalResources();
  lazyLoader.lazyLoadImages();
  lazyLoader.monitorPerformance();
}
