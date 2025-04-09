/**
 * fileStorage.js
 * 
 * @fileoverview Utilities for file storage operations.
 * This module provides functions for reading and writing account data.
 * 
 */

const fs = require('fs/promises');
const path = require('path');
const { config } = require('./config');
const { logger } = require('./logger');

/**
 * Save accounts data to file
 * @async
 * @param {Object} data - Data to save
 * @returns {Promise<boolean>} - Whether save was successful
 */
async function saveAccountsToFile(data) {
  try {
    // Ensure data directory exists
    const directory = path.dirname(config.ACCOUNTS_FILE);
    await fs.mkdir(directory, { recursive: true });
    
    // Write data to file
    await fs.writeFile(
      config.ACCOUNTS_FILE, 
      JSON.stringify(data, null, 2), 
      'utf8'
    );
    
    return true;
  } catch (error) {
    logger.error('Error saving accounts to file:', error);
    return false;
  }
}

/**
 * Load accounts data from file
 * @async
 * @returns {Promise<Object|null>} - Loaded data or null if file doesn't exist
 */
async function loadAccountsFromFile() {
  try {
    // Read data from file
    const data = await fs.readFile(config.ACCOUNTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Return null if file doesn't exist
    if (error.code === 'ENOENT') {
      logger.info('No accounts file found. Creating a new one.');
      return null;
    }
    
    // For any other error, log and return null
    logger.error('Error loading accounts from file:', error);
    return null;
  }
}

module.exports = {
  saveAccountsToFile,
  loadAccountsFromFile
};