/* 
 * RobloxAccountManager.js
 * 
 * @fileoverview Main class that orchestrates the Roblox account management functionality.
 * This class serves as the primary interface for the application, coordinating between
 * the different services and handling the account management operations.
 * 

 */

const { BrowserService } = require('./services/BrowserService');
const { RobloxAPIService } = require('./services/RobloxAPIService');
const { ApiInterface } = require('./api/ApiInterface');
const { Account } = require('./models/Account');
const { saveAccountsToFile, loadAccountsFromFile } = require('./utils/fileStorage');
const { config } = require('./utils/config');
const { logger } = require('./utils/logger');

/**
 * Main class for managing Roblox accounts
 * @class
 */
class RobloxAccountManager {
  /**
   * Create a new RobloxAccountManager instance
   * @constructor
   */
  constructor() {
    /**
     * Collection of user accounts
     * @type {Object.<string, Account>}
     * @private
     */
    this.accounts = {};
    
    /**
     * Last used place ID for game launching
     * @type {string|null}
     * @private
     */
    this.lastUsedPlaceId = null;
    
    /**
     * Browser service for handling puppeteer operations
     * @type {BrowserService}
     * @private
     */
    this.browserService = new BrowserService();
    
    /**
     * API service for Roblox API interactions
     * @type {RobloxAPIService}
     * @private
     */
    this.apiService = new RobloxAPIService();
    
    /**
     * API interface for handling external requests
     * @type {ApiInterface}
     * @private
     */
    this.apiInterface = null;
    
    /**
     * Map of next servers to join for each account
     * @type {Map<string, Object>}
     * @private
     */
    this.nextServers = new Map();
  }

  /**
   * Initialize the account manager
   * @async
   * @param {Object} options - Initialization options
   * @param {boolean} options.startApi - Whether to start the API server
   * @param {number} options.apiPort - Port for the API server
   * @returns {Promise<void>}
   */
  async initialize(options = {}) {
    try {
      // Load saved accounts from storage
      const data = await loadAccountsFromFile();
      
      if (data) {
        if (data.accounts) {
          // Convert plain objects to Account instances
          Object.entries(data.accounts).forEach(([key, accountData]) => {
            this.accounts[key] = new Account(accountData);
          });
          
          this.lastUsedPlaceId = data.lastUsedPlaceId || null;
          
          // Load next servers map if available
          if (data.nextServers) {
            this.nextServers = new Map(Object.entries(data.nextServers));
          }
        } else {
          // Handle old format (just accounts)
          Object.entries(data).forEach(([key, accountData]) => {
            this.accounts[key] = new Account(accountData);
          });
        }
        
        logger.info(`Loaded ${Object.keys(this.accounts).length} saved accounts`);
        
        if (this.lastUsedPlaceId) {
          logger.info(`Last used Place ID: ${this.lastUsedPlaceId}`);
        }
      }
      
      // Initialize API server if requested
      if (options.startApi) {
        await this.startApiServer(options.apiPort || config.API_PORT || 8099);
      }
    } catch (error) {
      logger.error('Initialization error:', error);
      // Create empty accounts file if it doesn't exist
      await this.saveAccounts();
    }
  }
  
  /**
   * Start the API server
   * @async
   * @param {number} port - Port to listen on
   * @returns {Promise<void>}
   */
  async startApiServer(port) {
    try {
      this.apiInterface = new ApiInterface(this, { 
        port,
        password: config.API.PASSWORD 
      });
      await this.apiInterface.initialize();
      
      const passwordMsg = config.API.PASSWORD 
        ? ` (Password protected: ?Password=${config.API.PASSWORD})` 
        : ' (No password protection)';
      
      logger.info(`API server started on port ${port}${passwordMsg}`);
    } catch (error) {
      logger.error('Failed to start API server:', error);
      throw error;
    }
  }
  
  /**
   * Stop the API server
   * @async
   * @returns {Promise<void>}
   */
  async stopApiServer() {
    if (this.apiInterface) {
      await this.apiInterface.stop();
      this.apiInterface = null;
      logger.info('API server stopped');
    }
  }

  /**
   * Save accounts to persistent storage
   * @async
   * @returns {Promise<void>}
   */
  async saveAccounts() {
    try {
      // Convert Account instances to plain objects for storage
      const accountsData = {};
      Object.entries(this.accounts).forEach(([key, account]) => {
        accountsData[key] = account.toJSON();
      });
      
      // Convert Map to object for storage
      const nextServersObj = {};
      this.nextServers.forEach((serverInfo, accountName) => {
        nextServersObj[accountName] = serverInfo;
      });
      
      const dataToSave = {
        accounts: accountsData,
        lastUsedPlaceId: this.lastUsedPlaceId,
        nextServers: nextServersObj
      };
      
      await saveAccountsToFile(dataToSave);
      logger.info('Accounts saved successfully');
    } catch (error) {
      logger.error('Error saving accounts:', error);
    }
  }

  /**
   * Launch browser for account login
   * @async
   * @returns {Promise<Object>} - Browser page object
   */
  async launchLoginBrowser() {
    try {
      const page = await this.browserService.launchLoginBrowser();
      
      // Setup handlers to capture login data
      await this._setupLoginCaptureHandlers(page);
      
      logger.info('Login page loaded. Please log in manually to capture the cookie.');
      return page;
    } catch (error) {
      logger.error('Error launching login browser:', error);
      throw error;
    }
  }

  /**
   * Set up request interception handlers to capture login credentials
   * @async
   * @param {Object} page - Browser page object
   * @private
   * @returns {Promise<void>}
   */
  async _setupLoginCaptureHandlers(page) {
    let password = '';
    
    // Listen for responses from auth endpoints
    page.on('response', async (response) => {
      const url = response.url();
      
      // Look for successful auth responses
      if ((url.includes('auth.roblox.com/v2/login') || 
           url.includes('auth.roblox.com/v2/signup')) && 
          response.status() === 200) {
        
        try {
          // Try to get the cookies
          const cookies = await page.cookies();
          const securityCookie = cookies.find(c => c.name === '.ROBLOSECURITY');
          
          if (securityCookie) {
            logger.info('Login successful! Captured .ROBLOSECURITY cookie.');
            await this.addAccount(securityCookie.value, password);
          }
        } catch (err) {
          logger.error('Error capturing cookies:', err);
        }
      }
    });
    
    // Capture password from login form
    page.on('request', async (request) => {
      try {
        if (request.url().includes('auth.roblox.com/v2/login') && 
            request.method() === 'POST') {
          const postData = request.postData();
          if (postData) {
            try {
              const data = JSON.parse(postData);
              if (data.password) {
                password = data.password;
              }
            } catch (e) {
              // Not JSON data
            }
          }
        }
      } catch (err) {
        // Ignore errors in request capturing
      }
    });
    
    // Add navigation handler to detect successful login
    page.on('framenavigated', async (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        
        // Check if navigated to home page (successful login)
        if (url.includes('roblox.com/home')) {
          const cookies = await page.cookies();
          const securityCookie = cookies.find(c => c.name === '.ROBLOSECURITY');
          
          if (securityCookie) {
            logger.info('Login successful! Captured .ROBLOSECURITY cookie from navigation.');
            await this.addAccount(securityCookie.value, password);
            
            // Wait a moment before closing
            setTimeout(async () => {
              // Close the page but keep browser open
              if (!page.isClosed()) {
                await page.close();
              }
            }, 1000);
          }
        }
      }
    });
  }

  /**
   * Add a new account to the manager
   * @async
   * @param {string} securityToken - Roblox security token (.ROBLOSECURITY cookie)
   * @param {string} [password=''] - Account password (if captured during login)
   * @returns {Promise<string>} - Account key
   */
  async addAccount(securityToken, password = '') {
    try {
      // Get account info from Roblox API
      const accountInfo = await this.apiService.getAccountInfo(securityToken);
      const username = accountInfo.name || 'Unknown';
      const userId = accountInfo.id || crypto.randomUUID().substring(0, 8);
      
      // Generate a unique key for the account
      const accountKey = username !== 'Unknown' ? username : `Account_${userId}`;
      
      // Create new account instance
      const account = new Account({
        username,
        userId,
        securityToken,
        password,
        addedAt: new Date().toISOString()
      });
      
      // Add to accounts collection
      this.accounts[accountKey] = account;
      
      logger.info(`Added account: ${username} (User ID: ${userId})`);
      
      // Save accounts to file
      await this.saveAccounts();
      
      return accountKey;
    } catch (error) {
      logger.error('Error adding account:', error);
      
      // Handle failure case - create account with unknown info
      const randomId = crypto.randomUUID().substring(0, 8);
      const accountKey = `Unknown_${randomId}`;
      
      const account = new Account({
        username: 'Unknown',
        userId: randomId,
        securityToken,
        password,
        addedAt: new Date().toISOString()
      });
      
      this.accounts[accountKey] = account;
      
      await this.saveAccounts();
      return accountKey;
    }
  }

  /**
   * Launch a Roblox game with the specified account
   * @async
   * @param {string} accountName - Account identifier
   * @param {string|number} placeId - Roblox place ID
   * @param {string} [jobId=''] - Optional job ID for specific game server
   * @param {boolean} [followUser=false] - Whether to follow a user instead of joining a place
   * @param {boolean} [joinVIP=false] - Whether this is a VIP server join
   * @returns {Promise<Object>} - Result of the launch attempt
   */
  async launchGame(accountName, placeId, jobId = '', followUser = false, joinVIP = false) {
    try {
      const account = this.accounts[accountName];
      
      if (!account) {
        logger.error(`Account "${accountName}" not found`);
        return { success: false, message: `Account "${accountName}" not found` };
      }
      
      // Check if there's a next server set for this account and place
      let serverToJoin = jobId;
      if (!jobId && this.nextServers.has(accountName)) {
        const serverInfo = this.nextServers.get(accountName);
        if (serverInfo.placeId == placeId) {
          serverToJoin = serverInfo.jobId;
          logger.info(`Using previously set server ${serverToJoin} for account ${accountName}`);
          
          // Clear the next server after using it
          this.nextServers.delete(accountName);
          await this.saveAccounts();
        }
      }
      
      logger.info(`Launching game for ${accountName} (PlaceID: ${placeId}, JobID: ${serverToJoin || 'Default'})`);
      
      // Generate browser tracker ID if it doesn't exist
      if (!account.browserTrackerId) {
        account.generateBrowserTrackerId();
        await this.saveAccounts();
      }
      
      // Validate the Place ID
      if (isNaN(parseInt(placeId))) {
        return {
          success: false,
          message: "Invalid Place ID. Please enter a valid numeric ID."
        };
      }
      
      // Save the place ID for future use
      this.lastUsedPlaceId = placeId;
      await this.saveAccounts();
      
      return await this.apiService.launchGame(account, placeId, serverToJoin, followUser, joinVIP);
    } catch (error) {
      logger.error('Error launching game:', error);
      return { success: false, message: `Error: ${error.message}` };
    }
  }

  /**
   * List all saved accounts
   * @returns {Array} - List of account information
   */
  listAccounts() {
    const accountList = Object.values(this.accounts);
    
    if (accountList.length === 0) {
      console.log('No accounts saved');
      return [];
    }
    
    console.log('\n=== Saved Accounts ===');
    accountList.forEach((account, index) => {
      console.log(`${index + 1}. ${account.username} (Added: ${new Date(account.addedAt).toLocaleString()})`);
    });
    
    return accountList;
  }

  /**
   * Delete an account by name
   * @async
   * @param {string} accountName - Account identifier
   * @returns {Promise<boolean>} - Whether deletion was successful
   */
  async deleteAccount(accountName) {
    if (!this.accounts[accountName]) {
      return false;
    }
    
    delete this.accounts[accountName];
    await this.saveAccounts();
    return true;
  }

  /**
   * Set the next server for an account to join
   * @param {string} accountName - Account identifier
   * @param {string|number} placeId - Roblox place ID
   * @param {string} jobId - Server job ID
   * @returns {boolean} - Whether setting the server was successful
   */
  setNextServerForAccount(accountName, placeId, jobId) {
    if (!this.accounts[accountName]) {
      logger.error(`Account "${accountName}" not found`);
      return false;
    }
    
    // Store the server info
    this.nextServers.set(accountName, {
      placeId,
      jobId,
      setAt: new Date().toISOString()
    });
    
    logger.info(`Set next server for ${accountName}: Place ID ${placeId}, Job ID ${jobId}`);
    
    // Save the updated settings
    this.saveAccounts();
    
    return true;
  }
  
  /**
   * Get account alias
   * @param {string} accountName - Account identifier
   * @returns {string} - Account alias or empty string if not found
   */
  getAccountAlias(accountName) {
    const account = this.accounts[accountName];
    if (!account) {
      return '';
    }
    
    return account.alias || '';
  }
  
  /**
   * Get account description
   * @param {string} accountName - Account identifier
   * @returns {string} - Account description or empty string if not found
   */
  getAccountDescription(accountName) {
    const account = this.accounts[accountName];
    if (!account) {
      return '';
    }
    
    return account.description || '';
  }
  
  /**
   * Set account alias
   * @param {string} accountName - Account identifier
   * @param {string} alias - New alias
   * @returns {boolean} - Whether setting the alias was successful
   */
  setAccountAlias(accountName, alias) {
    const account = this.accounts[accountName];
    if (!account) {
      return false;
    }
    
    account.alias = alias;
    this.saveAccounts();
    return true;
  }
  
  /**
   * Set account description
   * @param {string} accountName - Account identifier
   * @param {string} description - New description
   * @returns {boolean} - Whether setting the description was successful
   */
  setAccountDescription(accountName, description) {
    const account = this.accounts[accountName];
    if (!account) {
      return false;
    }
    
    account.description = description;
    this.saveAccounts();
    return true;
  }

  /**
   * Clean up resources
   * @async
   * @returns {Promise<void>}
   */
  async close() {
    // Stop API server if running
    if (this.apiInterface) {
      await this.stopApiServer();
    }
    
    await this.browserService.closeBrowser();
  }
}

module.exports = { RobloxAccountManager };