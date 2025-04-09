/**
 * Account.js
 * 
 * @fileoverview Defines the Account class that represents a Roblox account entity.
 * This class handles account-specific data and operations.
 * 
 */

/**
 * Class representing a Roblox account
 * @class
 */
class Account {
    /**
     * Create a new Account instance
     * @constructor
     * @param {Object} accountData - Account data properties
     * @param {string} accountData.username - Account username
     * @param {string|number} accountData.userId - Roblox user ID
     * @param {string} accountData.securityToken - .ROBLOSECURITY cookie value
     * @param {string} [accountData.password=''] - Account password (if captured)
     * @param {string} [accountData.addedAt] - ISO timestamp when account was added
     * @param {string} [accountData.lastUsed] - ISO timestamp when account was last used
     * @param {string} [accountData.browserTrackerId] - Browser tracker ID for game launch
     */
    constructor(accountData) {
      /**
       * Account username
       * @type {string}
       */
      this.username = accountData.username || 'Unknown';
      
      /**
       * Roblox user ID
       * @type {string|number}
       */
      this.userId = accountData.userId || '';
      
      /**
       * Security token (.ROBLOSECURITY cookie)
       * @type {string}
       */
      this.securityToken = accountData.securityToken || '';
      
      /**
       * Account password (if captured during login)
       * @type {string}
       */
      this.password = accountData.password || '';
      
      /**
       * ISO timestamp of when the account was added
       * @type {string}
       */
      this.addedAt = accountData.addedAt || new Date().toISOString();
      
      /**
       * ISO timestamp of when the account was last used
       * @type {string}
       */
      this.lastUsed = accountData.lastUsed || null;
      
      /**
       * Browser tracker ID for game launch
       * @type {string}
       */
      this.browserTrackerId = accountData.browserTrackerId || null;
    }
  
    /**
     * Generate a new browser tracker ID
     * @returns {string} - The generated browser tracker ID
     */
    generateBrowserTrackerId() {
      const r = Math.random();
      this.browserTrackerId = Math.floor(100000 + r * 75000).toString() + 
                              Math.floor(100000 + r * 800000).toString();
      return this.browserTrackerId;
    }
  
    /**
     * Update the last used timestamp
     * @returns {string} - The updated ISO timestamp
     */
    updateLastUsed() {
      this.lastUsed = new Date().toISOString();
      return this.lastUsed;
    }
  
    /**
     * Convert the account instance to a plain object for serialization
     * @returns {Object} - Plain JavaScript object representation
     */
    toJSON() {
      return {
        username: this.username,
        userId: this.userId,
        securityToken: this.securityToken,
        password: this.password,
        addedAt: this.addedAt,
        lastUsed: this.lastUsed,
        browserTrackerId: this.browserTrackerId,
        alias: this.alias,
        description: this.description,
        group: this.group
      };
    }
  }
  
  module.exports = { Account };