#!/usr/bin/env node
const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

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

// Build configuration
const buildConfigs = {
  cloudbeds: {
    entryPoint: 'src/cloudbeds/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_cloudbeds.js'
  },
  mews: {
    entryPoint: 'src/mews/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_mews.js'
  },
  guesty: {
    entryPoint: 'src/guesty/klaviyo_hotel_tracking.js',
    outfile: 'public/klaviyo_hotel_tracking_guesty.js'
  }
};

async function build(config) {
  const options = {
    entryPoints: [config.entryPoint],
    bundle: true,
    outfile: config.outfile,
    format: 'iife',
    define: {
      'process.env.MONITORING_ACCOUNT': JSON.stringify(MONITORING_ACCOUNT),
      'process.env.MONITORING_PROFILE_ID': JSON.stringify(MONITORING_PROFILE_ID),
      'process.env.DEBUG_ACCOUNT_IDS': JSON.stringify(DEBUG_ACCOUNT_IDS) // Injected as array
    }
  };

  try {
    if (watch) {
      const context = await esbuild.context(options);
      await context.watch();
      console.log(`Watching ${config.entryPoint}...`);
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
    console.error('Usage: node build.js <integration> [--watch]');
    console.error('  integration: cloudbeds, mews, or guesty');
    process.exit(1);
  }

  const config = buildConfigs[integration];
  if (!config) {
    console.error(`Unknown integration: ${integration}`);
    console.error('Valid options: cloudbeds, mews, guesty');
    process.exit(1);
  }

  await build(config);
}

main();
