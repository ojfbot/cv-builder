#!/usr/bin/env node

/**
 * CLI Wrapper for Browser Automation Service
 *
 * Provides command-line access to common automation operations
 */

import { Command } from 'commander';
import axios from 'axios';
import chalk from 'chalk';

const API_URL = process.env.BROWSER_AUTOMATION_URL || 'http://localhost:3002/api';

const program = new Command();

program
  .name('browser-automation')
  .description('CLI for CV Builder browser automation service')
  .version('0.3.0');

// Screenshot command
program
  .command('screenshot <url> [output]')
  .description('Capture screenshot of URL')
  .option('-v, --viewport <preset>', 'Viewport preset (mobile, tablet, desktop)', 'desktop')
  .option('-f, --format <format>', 'Image format (png, jpeg)', 'png')
  .option('-q, --quality <number>', 'JPEG quality (0-100)', '90')
  .option('-s, --selector <selector>', 'CSS selector for element screenshot')
  .action(async (url, output, options) => {
    try {
      console.log(chalk.blue('→ Navigating to'), url);

      await axios.post(`${API_URL}/navigate`, { url });

      console.log(chalk.blue('→ Capturing screenshot...'));

      const screenshotData: any = {
        name: output || 'screenshot',
        viewport: options.viewport,
        format: options.format,
        quality: parseInt(options.quality),
        sessionDir: 'temp/screenshots/cli',
      };

      if (options.selector) {
        screenshotData.selector = options.selector;
      }

      const result = await axios.post(`${API_URL}/screenshot`, screenshotData);

      console.log(chalk.green('✓ Screenshot saved:'), result.data.path);
      console.log(chalk.gray('  File size:'), (result.data.fileSize / 1024).toFixed(2), 'KB');
      console.log(chalk.gray('  Viewport:'), `${result.data.viewport.width}x${result.data.viewport.height}`);
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// Test command
program
  .command('test <url> <selector>')
  .description('Test if element exists on page')
  .action(async (url, selector) => {
    try {
      console.log(chalk.blue('→ Navigating to'), url);
      await axios.post(`${API_URL}/navigate`, { url });

      console.log(chalk.blue('→ Checking for element:'), selector);
      const result = await axios.get(`${API_URL}/element/exists`, {
        params: { selector },
      });

      if (result.data.exists) {
        console.log(chalk.green('✓ Element found'));
        console.log(chalk.gray('  Visible:'), result.data.visible);
        console.log(chalk.gray('  Enabled:'), result.data.enabled);
        console.log(chalk.gray('  Count:'), result.data.count);
      } else {
        console.log(chalk.red('✗ Element not found'));
        process.exit(1);
      }
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// Navigate command
program
  .command('navigate <url>')
  .description('Navigate browser to URL')
  .option('-w, --wait <state>', 'Wait for state (load, networkidle, domcontentloaded)', 'load')
  .action(async (url, options) => {
    try {
      console.log(chalk.blue('→ Navigating to'), url);

      const result = await axios.post(`${API_URL}/navigate`, {
        url,
        waitFor: options.wait,
      });

      console.log(chalk.green('✓ Navigation complete'));
      console.log(chalk.gray('  Title:'), result.data.title);
      console.log(chalk.gray('  URL:'), result.data.currentUrl);
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// Click command
program
  .command('click <selector>')
  .description('Click on element (requires active session)')
  .action(async (selector) => {
    try {
      console.log(chalk.blue('→ Clicking:'), selector);

      await axios.post(`${API_URL}/interact/click`, {
        selector,
      });

      console.log(chalk.green('✓ Click successful'));
    } catch (error: any) {
      console.error(chalk.red('✗ Error:'), error.response?.data?.error || error.message);
      process.exit(1);
    }
  });

// Health command
program
  .command('health')
  .description('Check service health')
  .action(async () => {
    try {
      const result = await axios.get('http://localhost:3002/health');

      console.log(chalk.green('✓ Service is healthy'));
      console.log(chalk.gray('  Status:'), result.data.status);
      console.log(chalk.gray('  Version:'), result.data.version);
      console.log(chalk.gray('  Browser connected:'), result.data.browser?.connected || false);

      if (result.data.session) {
        console.log(chalk.gray('  Session ID:'), result.data.session.id);
      }
    } catch (error: any) {
      console.error(chalk.red('✗ Service unavailable'));
      console.error(chalk.gray('  Make sure the service is running: docker-compose up browser-automation'));
      process.exit(1);
    }
  });

program.parse();
