/**
 * BrowserService.js
 * 
 * @fileoverview Service for handling browser interactions using Puppeteer.
 * This class provides methods for launching browsers, managing pages,
 * and handling browser-related operations.
 * 
 * @author Your Name
 * @version 1.0.0
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { config } = require('../utils/config');
const { logger } = require('../utils/logger');

// Apply stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

/**
 * Service class for browser interactions
 * @class
 */
class BrowserService {
  /**
   * Create a new BrowserService instance
   * @constructor
   */
  constructor() {
    /**
     * Puppeteer browser instance
     * @type {Object|null}
     * @private
     */
    this.browser = null;
    
    /**
     * Current active page
     * @type {Object|null}
     * @private
     */
    this.currentPage = null;
    
    /**
     * Window size configuration
     * @type {Object}
     * @private
     */
    this.windowSize = config.WINDOW_SIZE;
    
    /**
     * User agent to use for browser requests
     * @type {string}
     * @private
     */
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
  }

  /**
   * Launch a browser for login purposes
   * @async
   * @returns {Promise<Object>} - Browser page object
   */
  async launchLoginBrowser() {
    try {
      // Launch browser if not already running
      if (!this.browser) {
        this.browser = await puppeteer.launch({
          headless: false,
          defaultViewport: null,
          args: [
            `--window-size=${this.windowSize.width},${this.windowSize.height}`,
            '--disable-web-security',
            '--no-sandbox'
          ]
        });
      }

      // Create a new page
      this.currentPage = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await this.currentPage.setUserAgent(this.userAgent);
      
      // Navigate to Roblox login page
      await this.currentPage.goto('https://www.roblox.com/login', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });

      // Apply dark theme (purely cosmetic)
      await this.currentPage.evaluate(() => {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
      });

      return this.currentPage;
    } catch (error) {
      logger.error('Error launching login browser:', error);
      throw error;
    }
  }

  /**
   * Open a browser with a specific account already logged in
   * @async
   * @param {Account} account - Account to log in with
   * @returns {Promise<Object>} - Browser instance
   */
  async openAccountBrowser(account) {
    try {
      const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null,
        args: [
          `--window-size=${this.windowSize.width},${this.windowSize.height}`,
          '--disable-web-security',
          '--no-sandbox'
        ]
      });
      
      const page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      // Set the security cookie
      await page.setCookie({
        name: '.ROBLOSECURITY',
        value: account.securityToken,
        domain: '.roblox.com',
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'Lax'
      });
      
      // Navigate to Roblox home page
      await page.goto('https://www.roblox.com/home', {
        waitUntil: 'networkidle2',
        timeout: 60000
      });
      
      // Apply dark theme
      await page.evaluate(() => {
        document.body.classList.remove("light-theme");
        document.body.classList.add("dark-theme");
      });
      
      logger.info('Account browser opened successfully');
      
      return browser;
    } catch (error) {
      logger.error('Error opening account browser:', error);
      throw error;
    }
  }

  /**
   * Close the browser and clean up resources
   * @async
   * @returns {Promise<void>}
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.currentPage = null;
      logger.info('Browser closed');
    }
  }
}

module.exports = { BrowserService };