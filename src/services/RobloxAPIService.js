/**
 * RobloxAPIService.js
 * 
 * @fileoverview Service for handling all Roblox API interactions.
 * This class encapsulates all API calls to Roblox services.
 * 
 */

const fetch = require('node-fetch');
const { exec } = require('child_process');
const { logger } = require('../utils/logger');

/**
 * Service class for Roblox API interactions
 * @class
 */
class RobloxAPIService {
  /**
   * Create a new RobloxAPIService instance
   * @constructor
   */
  constructor() {
    /**
     * Default user agent for requests
     * @type {string}
     * @private
     */
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/111.0.0.0 Safari/537.36';
  }

  /**
   * Get account information using the security token
   * @async
   * @param {string} securityToken - .ROBLOSECURITY cookie value
   * @returns {Promise<Object>} - Account information
   */
  async getAccountInfo(securityToken) {
    try {
      // Make direct API request to get user info
      const response = await fetch('https://users.roblox.com/v1/users/authenticated', {
        headers: {
          'Cookie': `.ROBLOSECURITY=${securityToken}`,
          'User-Agent': this.userAgent
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        logger.info(`Retrieved account info for ${data.name}`);
        return {
          name: data.name,
          id: data.id,
          displayName: data.displayName
        };
      }
      
      // Try alternative API endpoint
      const altResponse = await fetch('https://www.roblox.com/mobileapi/userinfo', {
        headers: {
          'Cookie': `.ROBLOSECURITY=${securityToken}`,
          'User-Agent': this.userAgent
        }
      });
      
      if (altResponse.ok) {
        const altData = await altResponse.json();
        logger.info(`Retrieved account info from alternative API: ${altData.UserName}`);
        return {
          name: altData.UserName,
          id: altData.UserID,
          displayName: altData.UserName
        };
      }
      
      logger.error('Failed to get account info from both API endpoints');
      return { name: 'Unknown', id: null };
    } catch (error) {
      logger.error('Error getting account info:', error);
      return { name: 'Unknown', id: null };
    }
  }

  /**
   * Get CSRF token required for many Roblox API calls
   * @async
   * @param {string} securityToken - .ROBLOSECURITY cookie value
   * @returns {Promise<string|null>} - CSRF token or null if unsuccessful
   */
  async getCSRFToken(securityToken) {
    try {
      // Make a POST request to get the CSRF token
      const response = await fetch('https://auth.roblox.com/v1/authentication-ticket/', {
        method: 'POST',
        headers: {
          'Cookie': `.ROBLOSECURITY=${securityToken}`,
          'Referer': 'https://www.roblox.com/games/4924922222/Brookhaven-RP',
          'User-Agent': this.userAgent
        }
      });
      
      // CSRF token is returned in the x-csrf-token header when the request fails with 403 Forbidden
      if (response.status === 403) {
        const csrfToken = response.headers.get('x-csrf-token');
        if (csrfToken) {
          return csrfToken;
        }
      }
      
      logger.error(`Failed to get CSRF token, status: ${response.status}`);
      return null;
    } catch (error) {
      logger.error('Error getting CSRF token:', error);
      return null;
    }
  }

  /**
   * Get authentication ticket needed for game launch
   * @async
   * @param {string} securityToken - .ROBLOSECURITY cookie value
   * @returns {Promise<string|null>} - Authentication ticket or null if unsuccessful
   */
  async getAuthTicket(securityToken) {
    try {
      // Get CSRF token first
      const csrfToken = await this.getCSRFToken(securityToken);
      if (!csrfToken) {
        logger.error('Failed to get CSRF token for auth ticket');
        return null;
      }
      
      logger.info('Got CSRF token:', csrfToken);
      
      // Make request to get auth ticket
      const response = await fetch('https://auth.roblox.com/v1/authentication-ticket/', {
        method: 'POST',
        headers: {
          'Cookie': `.ROBLOSECURITY=${securityToken}`,
          'Referer': 'https://www.roblox.com/games/4924922222/Brookhaven-RP',
          'X-CSRF-TOKEN': csrfToken,
          'User-Agent': this.userAgent,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({}) // Empty JSON body
      });
      
      // Print headers for debugging
      logger.debug('Response status:', response.status);
      const headers = {};
      response.headers.forEach((value, name) => {
        headers[name.toLowerCase()] = value;
      });
      
      // Auth ticket is in the response headers with lowercase name
      const authTicket = headers['rbx-authentication-ticket'];
      
      if (!authTicket) {
        logger.error('No authentication ticket found in response headers');
        return null;
      }
      
      return authTicket;
    } catch (error) {
      logger.error('Error getting auth ticket:', error);
      return null;
    }
  }

  /**
   * Get the access code for a VIP server from a link code
   * @async
   * @param {string} securityToken - .ROBLOSECURITY cookie value
   * @param {string|number} placeId - Roblox place ID
   * @param {string} linkCode - VIP server link code
   * @returns {Promise<string|null>} - VIP server access code or null if unsuccessful
   */
  async getPrivateServerAccessCode(securityToken, placeId, linkCode) {
    try {
      // Get CSRF token first
      const csrfToken = await this.getCSRFToken(securityToken);
      if (!csrfToken) {
        logger.error('Failed to get CSRF token for private server access');
        return null;
      }
      
      // Make request to get private server page
      const response = await fetch(`https://www.roblox.com/games/${placeId}?privateServerLinkCode=${linkCode}`, {
        headers: {
          'Cookie': `.ROBLOSECURITY=${securityToken}`,
          'X-CSRF-TOKEN': csrfToken,
          'Referer': 'https://www.roblox.com/games/4924922222/Brookhaven-RP',
          'User-Agent': this.userAgent
        }
      });
      
      const html = await response.text();
      
      // Parse the access code from the page content
      const accessCodeMatch = html.match(/Roblox\.GameLauncher\.joinPrivateGame\(\d+\,\s*'(\w+\-\w+\-\w+\-\w+\-\w+)'/);
      
      if (accessCodeMatch && accessCodeMatch[1]) {
        return accessCodeMatch[1];
      }
      
      logger.error('Could not find access code in response');
      return null;
    } catch (error) {
      logger.error('Error getting private server access code:', error);
      return null;
    }
  }

  /**
   * Format the launch URL for the Roblox protocol
   * @param {string} placeLauncherUrl - Base URL for place launcher
   * @param {string} authTicket - Authentication ticket
   * @param {string} browserTrackerId - Browser tracker ID
   * @param {number} launchTime - Launch timestamp
   * @returns {string} - Formatted launch URL
   */
  formatLaunchURL(placeLauncherUrl, authTicket, browserTrackerId, launchTime) {
    // Encode the placeLauncherUrl component
    const encodedUrl = encodeURIComponent(placeLauncherUrl);
    
    // Format the full URL with the roblox-player protocol
    return `roblox-player:1+launchmode:play+gameinfo:${authTicket}+launchtime:${launchTime}+placelauncherurl:${encodedUrl}+browsertrackerid:${browserTrackerId}+robloxLocale:en_us+gameLocale:en_us+channel:+LaunchExp:InApp`;
  }

  /**
   * Launch a Roblox game
   * @async
   * @param {Account} account - Account instance
   * @param {string|number} placeId - Roblox place ID
   * @param {string} [jobId=''] - Optional job ID for specific game server
   * @param {boolean} [followUser=false] - Whether to follow a user instead of joining a place
   * @param {boolean} [joinVIP=false] - Whether this is a VIP server join
   * @returns {Promise<Object>} - Result of the launch attempt
   */
  async launchGame(account, placeId, jobId = '', followUser = false, joinVIP = false) {
    try {
      // Update last use timestamp
      account.updateLastUsed();
      
      // Get authentication ticket (required for game launch)
      const authTicket = await this.getAuthTicket(account.securityToken);
      
      if (!authTicket) {
        return { 
          success: false, 
          message: "ERROR: Failed to get authentication ticket. Your account session may have expired. Please log in again." 
        };
      }
      
      logger.info('Successfully obtained authentication ticket');
      
      // Process link code (for VIP servers)
      let accessCode = jobId;
      let linkCode = '';
      
      if (jobId && jobId.includes('privateServerLinkCode=')) {
        const linkCodeMatch = jobId.match(/privateServerLinkCode=(.+)/);
        if (linkCodeMatch && linkCodeMatch[1]) {
          linkCode = linkCodeMatch[1];
          // Get the access code for the VIP server
          accessCode = await this.getPrivateServerAccessCode(account.securityToken, placeId, linkCode);
          if (accessCode) {
            joinVIP = true;
          }
        }
      }
      
      // Generate launch URL based on join type
      const launchTime = Math.floor(Date.now() / 1000);
      
      let launchURL;
      
      if (joinVIP) {
        launchURL = this.formatLaunchURL(
          `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestPrivateGame&placeId=${placeId}&accessCode=${accessCode}&linkCode=${linkCode}`,
          authTicket,
          account.browserTrackerId,
          launchTime
        );
      } else if (followUser) {
        launchURL = this.formatLaunchURL(
          `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestFollowUser&userId=${placeId}`,
          authTicket,
          account.browserTrackerId,
          launchTime
        );
      } else {
        launchURL = this.formatLaunchURL(
          `https://assetgame.roblox.com/game/PlaceLauncher.ashx?request=RequestGame${jobId ? 'Job' : ''}&browserTrackerId=${account.browserTrackerId}&placeId=${placeId}${jobId ? '&gameId=' + jobId : ''}&isPlayTogetherGame=false`,
          authTicket,
          account.browserTrackerId,
          launchTime
        );
      }
      
      // Launch the game using the protocol handler
      logger.info(`Launching with URL: ${launchURL}`);
      
      // We need to use child_process to launch the URL
      // On Windows use start command, on macOS use open, on Linux use xdg-open
      let command;
      if (process.platform === 'win32') {
        command = `start "${launchURL}"`;
      } else if (process.platform === 'darwin') {
        command = `open "${launchURL}"`;
      } else {
        command = `xdg-open "${launchURL}"`;
      }
      
      exec(command, (error) => {
        if (error) {
          logger.error(`Error launching Roblox: ${error}`);
          return;
        }
        logger.info('Roblox launch command executed');
      });
      
      return { success: true, message: "Game launch initiated. Roblox should start momentarily." };
    } catch (error) {
      logger.error('Error launching game:', error);
      return { success: false, message: `Error: ${error.message}` };
    }
  }
}

module.exports = { RobloxAPIService };