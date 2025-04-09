/**
 * CommandLineInterface.js
 * 
 * @fileoverview Command-line interface for interacting with the Roblox Account Manager.
 * This class provides a text-based user interface for managing Roblox accounts.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const readline = require('readline');
const { RobloxAccountManager } = require('../RobloxAccountManager');
const { logger } = require('../utils/logger');

/**
 * Class handling command-line interface interactions
 * @class
 */
class CommandLineInterface {
  /**
   * Create a new CommandLineInterface instance
   * @constructor
   */
  constructor() {
    /**
     * Readline interface for user input/output
     * @type {Object}
     * @private
     */
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    /**
     * RobloxAccountManager instance
     * @type {RobloxAccountManager}
     * @private
     */
    this.manager = new RobloxAccountManager();
  }

  /**
   * Initialize the CLI and manager
   * @async
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Initialize the account manager
      await this.manager.initialize();
      
      // Display welcome message
      logger.info('\n=== Roblox Account Manager ===');
      logger.info('Type "help" to see available commands');
      
      // Start the command loop
      this.showMenu();
    } catch (error) {
      logger.error('Failed to initialize CLI:', error);
      this.rl.close();
      process.exit(1);
    }
  }

  /**
   * Display the main menu
   */
  showMenu() {
    console.log('\n=== Roblox Account Manager ===');
    console.log('1. Add new account (login)');
    console.log('2. Launch saved account in browser');
    console.log('3. Launch game with account');
    console.log('4. List all accounts');
    console.log('5. Delete account');
    console.log('6. Exit');
    this.rl.question('Select an option: ', (option) => this.handleOption(option));
  }

  /**
   * Handle menu option selection
   * @async
   * @param {string} option - Selected menu option
   */
  async handleOption(option) {
    switch (option) {
      case '1':
        // Add new account via login
        try {
          await this.addNewAccount();
        } catch (error) {
          logger.error('Error adding new account:', error);
          this.showMenu();
        }
        break;
        
      case '2':
        // Launch saved account in browser
        try {
          await this.launchAccountBrowser();
        } catch (error) {
          logger.error('Error launching account browser:', error);
          this.showMenu();
        }
        break;
        
      case '3':
        // Launch game with account
        try {
          await this.launchGame();
        } catch (error) {
          logger.error('Error launching game:', error);
          this.showMenu();
        }
        break;
        
      case '4':
        // List all accounts
        this.listAccounts();
        break;
        
      case '5':
        // Delete account
        try {
          await this.deleteAccount();
        } catch (error) {
          logger.error('Error deleting account:', error);
          this.showMenu();
        }
        break;
        
      case '6':
        // Exit
        await this.exit();
        break;
        
      default:
        console.log('Invalid option');
        this.showMenu();
        break;
    }
  }

  /**
   * Add a new account through the login browser
   * @async
   * @returns {Promise<void>}
   */
  async addNewAccount() {
    await this.manager.launchLoginBrowser();
    console.log('Browser launched. Please log in to Roblox.');
    console.log('The account will be saved automatically after successful login.');
    
    this.rl.question('Press Enter to return to the menu once done...', () => {
      this.showMenu();
    });
  }

  /**
   * Launch an account in a browser
   * @async
   * @returns {Promise<void>}
   */
  async launchAccountBrowser() {
    const accounts = this.manager.listAccounts();
    if (accounts.length === 0) {
      this.showMenu();
      return;
    }
    
    this.rl.question('Enter account number to launch: ', async (index) => {
      const accountIndex = parseInt(index) - 1;
      if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= accounts.length) {
        console.log('Invalid account number');
        this.showMenu();
        return;
      }
      
      const accountName = Object.keys(this.manager.accounts)[accountIndex];
      console.log(`Launching account: ${accountName}`);
      
      // Get the browser service from the manager to open a browser with this account
      const browserService = this.manager.browserService;
      await browserService.openAccountBrowser(this.manager.accounts[accountName]);
      
      console.log('Account launched successfully. Browser window opened.');
      this.showMenu();
    });
  }

  /**
   * Launch a game with a selected account
   * @async
   * @returns {Promise<void>}
   */
  async launchGame() {
    const gameAccounts = this.manager.listAccounts();
    if (gameAccounts.length === 0) {
      this.showMenu();
      return;
    }
    
    this.rl.question('Enter account number to use: ', (accountIndex) => {
      const index = parseInt(accountIndex) - 1;
      if (isNaN(index) || index < 0 || index >= gameAccounts.length) {
        console.log('Invalid account number');
        this.showMenu();
        return;
      }
      
      const accountName = Object.keys(this.manager.accounts)[index];
      
      // Default to the last used Place ID if available
      const defaultPlaceId = this.manager.lastUsedPlaceId || '';
      const placeIdPrompt = defaultPlaceId 
        ? `Enter the Place ID to join (press Enter for ${defaultPlaceId}): `
        : 'Enter the Place ID to join: ';
      
      this.rl.question(placeIdPrompt, (placeId) => {
        // Use the last used Place ID if user just presses Enter
        if (placeId === '' && defaultPlaceId) {
          placeId = defaultPlaceId;
        }
        
        if (!placeId || isNaN(parseInt(placeId))) {
          console.log('Invalid Place ID');
          this.showMenu();
          return;
        }
        
        this.rl.question('Enter Job ID (optional, press Enter to skip): ', async (jobId) => {
          const result = await this.manager.launchGame(accountName, parseInt(placeId), jobId);
          
          if (result.success) {
            console.log(result.message);
          } else {
            console.error(result.message);
          }
          
          this.showMenu();
        });
      });
    });
  }

  /**
   * List all saved accounts
   */
  listAccounts() {
    const accounts = this.manager.listAccounts();
    
    if (accounts.length === 0) {
      console.log('\nNo accounts have been saved yet. Use option 1 to add a new account.');
    }
    
    // Short delay before showing menu to ensure output is visible
    setTimeout(() => {
      this.showMenu();
    }, 100);
  }

  /**
   * Delete a selected account
   * @async
   * @returns {Promise<void>}
   */
  async deleteAccount() {
    const accountsToDelete = this.manager.listAccounts();
    if (accountsToDelete.length === 0) {
      this.showMenu();
      return;
    }
    
    this.rl.question('Enter account number to delete: ', async (index) => {
      const accountIndex = parseInt(index) - 1;
      if (isNaN(accountIndex) || accountIndex < 0 || accountIndex >= accountsToDelete.length) {
        console.log('Invalid account number');
        this.showMenu();
        return;
      }
      
      const accountName = Object.keys(this.manager.accounts)[accountIndex];
      const deleted = await this.manager.deleteAccount(accountName);
      
      if (deleted) {
        console.log(`Deleted account: ${accountName}`);
      } else {
        console.log(`Failed to delete account: ${accountName}`);
      }
      
      this.showMenu();
    });
  }

  /**
   * Exit the application
   * @async
   * @returns {Promise<void>}
   */
  async exit() {
    try {
      // Clean up resources
      await this.manager.close();
      this.rl.close();
      logger.info('Exiting application...');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

module.exports = { CommandLineInterface };