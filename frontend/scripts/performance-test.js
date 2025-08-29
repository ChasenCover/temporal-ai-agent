#!/usr/bin/env node

/**
 * Performance Testing Script
 * Run with: node scripts/performance-test.js
 */

const fs = require('fs');
const path = require('path');

function analyzeBundleSize() {
  const distPath = path.join(__dirname, '../dist');
  const assetsPath = path.join(distPath, 'assets');
  
  if (!fs.existsSync(distPath)) {
    console.log('❌ Dist folder not found. Run "npm run build" first.');
    return;
  }

  let totalSize = 0;
  let totalGzipped = 0;

  console.log('\n📊 Bundle Size Analysis\n');
  console.log('File'.padEnd(50) + 'Size'.padEnd(15) + 'Gzipped'.padEnd(15));
  console.log('-'.repeat(80));

  // Analyze root dist files
  const rootFiles = fs.readdirSync(distPath);
  rootFiles.forEach(file => {
    if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.html')) {
      const filePath = path.join(distPath, file);
      const stats = fs.statSync(filePath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      // Estimate gzipped size (rough approximation)
      const gzippedKB = (stats.size * 0.3 / 1024).toFixed(2);
      
      totalSize += parseFloat(sizeKB);
      totalGzipped += parseFloat(gzippedKB);
      
      console.log(
        file.padEnd(50) + 
        `${sizeKB} kB`.padEnd(15) + 
        `${gzippedKB} kB`.padEnd(15)
      );
    }
  });

  // Analyze assets folder
  if (fs.existsSync(assetsPath)) {
    const assetFiles = fs.readdirSync(assetsPath);
    assetFiles.forEach(file => {
      if (file.endsWith('.js') || file.endsWith('.css')) {
        const filePath = path.join(assetsPath, file);
        const stats = fs.statSync(filePath);
        const sizeKB = (stats.size / 1024).toFixed(2);
        
        // Estimate gzipped size (rough approximation)
        const gzippedKB = (stats.size * 0.3 / 1024).toFixed(2);
        
        totalSize += parseFloat(sizeKB);
        totalGzipped += parseFloat(gzippedKB);
        
        console.log(
          `assets/${file}`.padEnd(50) + 
          `${sizeKB} kB`.padEnd(15) + 
          `${gzippedKB} kB`.padEnd(15)
        );
      }
    });
  }

  console.log('-'.repeat(80));
  console.log(
    'TOTAL'.padEnd(50) + 
    `${totalSize.toFixed(2)} kB`.padEnd(15) + 
    `${totalGzipped.toFixed(2)} kB`.padEnd(15)
  );

  // Performance recommendations
  console.log('\n🎯 Performance Recommendations:');
  
  if (totalSize > 200) {
    console.log('⚠️  Bundle size is large. Consider:');
    console.log('   - Further code splitting');
    console.log('   - Tree shaking unused dependencies');
    console.log('   - Lazy loading more components');
  } else {
    console.log('✅ Bundle size is reasonable');
  }

  if (totalGzipped > 50) {
    console.log('⚠️  Gzipped size could be optimized');
  } else {
    console.log('✅ Gzipped size is good');
  }
}

function checkOptimizations() {
  console.log('\n🔍 Optimization Checklist\n');
  
  const checks = [
    {
      name: 'Vite build config optimized',
      check: () => {
        const configPath = path.join(__dirname, '../vite.config.js');
        const config = fs.readFileSync(configPath, 'utf8');
        return config.includes('minify') && config.includes('manualChunks');
      }
    },
    {
      name: 'Service worker implemented',
      check: () => {
        const swPath = path.join(__dirname, '../public/sw.js');
        return fs.existsSync(swPath);
      }
    },
    {
      name: 'Lazy loading components',
      check: () => {
        const lazyPath = path.join(__dirname, '../src/components/LazyComponents.jsx');
        return fs.existsSync(lazyPath);
      }
    },
    {
      name: 'Performance monitoring hooks',
      check: () => {
        const hooksPath = path.join(__dirname, '../src/hooks/usePerformance.js');
        return fs.existsSync(hooksPath);
      }
    },
    {
      name: 'Web vitals monitoring',
      check: () => {
        const vitalsPath = path.join(__dirname, '../src/utils/webVitals.js');
        return fs.existsSync(vitalsPath);
      }
    }
  ];

  checks.forEach(({ name, check }) => {
    const status = check() ? '✅' : '❌';
    console.log(`${status} ${name}`);
  });
}

function main() {
  console.log('🚀 Performance Test Runner\n');
  
  checkOptimizations();
  analyzeBundleSize();
  
  console.log('\n📈 Next Steps:');
  console.log('1. Run "npm run dev" and check browser dev tools');
  console.log('2. Use Lighthouse for comprehensive performance audit');
  console.log('3. Monitor Core Web Vitals in production');
  console.log('4. Consider implementing performance budgets');
}

if (require.main === module) {
  main();
}

module.exports = { analyzeBundleSize, checkOptimizations };