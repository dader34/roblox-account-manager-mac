/**
 * index.js
 * 
 * @fileoverview Main entry point for the Roblox Account Manager application.
 * This file initializes the application and handles global error handling.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const { CommandLineInterface } = require('./src/cli/CommandLineInterface');
const { logger } = require('./src/utils/logger');

/**
 * Main function to start the application
 * @async
 */
async function main() {
  try {
    logger.info('Starting Roblox Account Manager...');
    
    // Create and initialize the CLI
    const cli = new CommandLineInterface();
    await cli.initialize();
    
  } catch (error) {
    logger.error('Application error:', error);
    process.exit(1);
  }
}

// Set up global error handlers
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
  process.exit(1);
});

// Start the application
main().catch((error) => {
  logger.error('Fatal application error:', error);
  process.exit(1);
});