#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Load environment variables from .env file
require('dotenv').config();

// Get environment variables with defaults
const MONITORING_ACCOUNT = process.env.MONITORING_ACCOUNT || '';
const MONITORING_PROFILE_ID = process.env.MONITORING_PROFILE_ID || 'guesty-onsite-monitoring';

// Parse DEBUG_ACCOUNT_IDS from JSON array string
const DEBUG_ACCOUNT_IDS_RAW = process.env.DEBUG_ACCOUNT_IDS || '[]';
const DEBUG_ACCOUNT_IDS = JSON.parse(DEBUG_ACCOUNT_IDS_RAW);

// Parse command line arguments
const args = process.argv.slice(2);
const integration = args[0]; // 'cloudbeds', 'mews', or 'guesty'
const watch = args.includes('--watch');
const deploy = args.includes('--deploy');

// Build configuration
const buildConfigs = {
  cloudbeds: {
    entryPoint: 'src/cloudbeds/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_cloudbeds.js',
    surgeDomain: 'klaviyo-hotel-cloudbeds.surge.sh'
  },
  mews: {
    entryPoint: 'src/mews/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_mews.js',
    surgeDomain: 'klaviyo-hotel-mews.surge.sh'
  },
  guesty: {
    entryPoint: 'src/guesty/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_guesty.js',
    surgeDomain: 'klaviyo-hotel-guesty.surge.sh'
  },
  olo: {
    entryPoint: 'src/olo/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_olo.js',
    surgeDomain: 'klaviyo-hotel-olo.surge.sh'
  }
};

// Serialize surge deploys. esbuild's watcher (unlike nodemon) never kills a
// running child process, and this lock means a save during an in-flight upload
// queues exactly one more deploy instead of interrupting it — interrupted
// uploads were what left the surge domain torn down (404).
let deploying = false;
let pendingDomain = null;
function deployToSurge(domain) {
  if (!domain) return;
  if (deploying) { pendingDomain = domain; return; }
  deploying = true;
  console.log(`Deploying public/ -> https://${domain} ...`);
  exec(`surge public ${domain}`, (error, stdout, stderr) => {
    deploying = false;
    if (error) {
      console.error(`surge deploy failed: ${(stderr || error.message).trim()}`);
    } else {
      console.log(`Deployed: https://${domain}`);
    }
    if (pendingDomain) {
      const next = pendingDomain;
      pendingDomain = null;
      deployToSurge(next);
    }
  });
}

async function build(config) {
  const plugins = [];
  // With --watch --deploy, redeploy to surge after each successful rebuild.
  if (watch && deploy) {
    plugins.push({
      name: 'surge-deploy',
      setup(b) {
        b.onEnd((result) => {
          if (result.errors && result.errors.length) {
            console.error('Build had errors — skipping deploy');
            return;
          }
          deployToSurge(config.surgeDomain);
        });
      }
    });
  }

  const options = {
    entryPoints: [config.entryPoint],
    bundle: true,
    outfile: config.outfile,
    format: 'iife',
    define: {
      'process.env.MONITORING_ACCOUNT': JSON.stringify(MONITORING_ACCOUNT),
      'process.env.MONITORING_PROFILE_ID': JSON.stringify(MONITORING_PROFILE_ID),
      'process.env.DEBUG_ACCOUNT_IDS': JSON.stringify(DEBUG_ACCOUNT_IDS) // Injected as array
    },
    plugins
  };

  try {
    if (watch) {
      const context = await esbuild.context(options);
      await context.watch(); // runs an initial build (deploys via onEnd), then watches
      console.log(`Watching ${config.entryPoint}...` + (deploy ? ` (auto-deploy to ${config.surgeDomain} on save)` : ''));
    } else {
      await esbuild.build(options);
      console.log(`Built ${config.outfile}`);
    }
  } catch (error) {
    console.error(`Build failed for ${config.entryPoint}:`, error);
    process.exit(1);
  }
}

// Main execution
async function main() {
  if (!integration) {
    console.error('Usage: node build.js <integration> [--watch] [--deploy]');
    console.error('  integration: cloudbeds, mews, guesty, or olo');
    console.error('  --watch          rebuild on file changes');
    console.error('  --deploy         with --watch, redeploy to surge after each build');
    process.exit(1);
  }

  const config = buildConfigs[integration];
  if (!config) {
    console.error(`Unknown integration: ${integration}`);
    console.error('Valid options: cloudbeds, mews, guesty, olo');
    process.exit(1);
  }

  await build(config);
}

main();
