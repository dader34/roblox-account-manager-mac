/**
 * index.js
 * 
 * @fileoverview Main entry point for the Roblox Account Manager application.
 * This file initializes the application and handles global error handling.
 * 
 */

const { RobloxAccountManager } = require('./src/RobloxAccountManager');
const { CommandLineInterface } = require('./src/cli/CommandLineInterface');
const { logger } = require('./src/utils/logger');
const { config } = require('./src/utils/config');

/**
 * Main function to start the application
 * @async
 */
async function main() {
  try {
    logger.info('Starting Roblox Account Manager...');
    
    // Create and initialize the manager
    const manager = new RobloxAccountManager();
    
    // Initialize with API if enabled
    await manager.initialize({
      startApi: config.API.ENABLE,
      apiPort: config.API.PORT
    });
    
    if (config.API.ENABLE) {
      logger.info(`API server available at http://localhost:${config.API.PORT}`);
    }
    
    // Create and initialize the CLI
    const cli = new CommandLineInterface();
    cli.setAccountManager(manager); // Pass the initialized manager to the CLI
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