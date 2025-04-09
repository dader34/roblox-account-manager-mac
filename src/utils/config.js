/**
 * config.js
 * 
 * @fileoverview Configuration settings for the Roblox Account Manager.
 * This module provides centralized configuration management.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const path = require('path');

/**
 * Application configuration
 * @type {Object}
 */
const config = {
  /**
   * Path to the accounts storage file
   * @type {string}
   */
  ACCOUNTS_FILE: path.join(process.cwd(), 'data', 'accounts.json'),
  
  /**
   * Window size for browser instances
   * @type {Object}
   */
  WINDOW_SIZE: { 
    width: 880, 
    height: 740 
  },
  
  /**
   * Log level for application logging
   * Options: 'error', 'warn', 'info', 'debug'
   * Set to 'error' or 'warn' to minimize output
   * @type {string}
   */
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  /**
   * Whether to run in quiet mode (minimal output)
   * @type {boolean}
   */
  QUIET_MODE: process.env.QUIET_MODE === 'true' || false,
  
  /**
   * Default browser user agent
   * @type {string}
   */
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36'
};

module.exports = { config };