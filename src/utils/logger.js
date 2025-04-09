/**
 * logger.js
 * 
 * @fileoverview Logging utility for the application.
 * This module provides consistent logging functionality across the application.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const { config } = require('./config');

/**
 * Log levels with corresponding numeric values
 * @type {Object}
 */
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

/**
 * Current log level based on configuration
 * @type {number}
 */
const currentLogLevel = LOG_LEVELS[config.LOG_LEVEL] || LOG_LEVELS.info;

/**
 * Whether to run in quiet mode (minimal output)
 * @type {boolean}
 */
const isQuietMode = config.QUIET_MODE;

/**
 * Format timestamp for log messages
 * @returns {string} - Formatted timestamp
 */
const getTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Logger object with methods for different log levels
 * @type {Object}
 */
const logger = {
  /**
   * Log an error message
   * @param {...*} args - Arguments to log
   */
  error: (...args) => {
    // Always show errors, even in quiet mode
    if (currentLogLevel >= LOG_LEVELS.error) {
      console.error(`[ERROR] ${getTimestamp()}:`, ...args);
    }
  },
  
  /**
   * Log a warning message
   * @param {...*} args - Arguments to log
   */
  warn: (...args) => {
    // Always show warnings, even in quiet mode
    if (currentLogLevel >= LOG_LEVELS.warn) {
      console.warn(`[WARN] ${getTimestamp()}:`, ...args);
    }
  },
  
  /**
   * Log an info message
   * @param {...*} args - Arguments to log
   */
  info: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.info && !isQuietMode) {
      console.log(`[INFO] ${getTimestamp()}:`, ...args);
    }
  },
  
  /**
   * Log a debug message
   * @param {...*} args - Arguments to log
   */
  debug: (...args) => {
    if (currentLogLevel >= LOG_LEVELS.debug && !isQuietMode) {
      console.log(`[DEBUG] ${getTimestamp()}:`, ...args);
    }
  },
  
  /**
   * Log an important message that should always be shown
   * @param {...*} args - Arguments to log
   */
  important: (...args) => {
    // Always show important messages regardless of log level or quiet mode
    console.log(...args);
  }
};

module.exports = { logger };