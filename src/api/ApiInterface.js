/**
* ApiInterface.js
* 
* @fileoverview API interface for the MacOS Roblox Account Manager.
* This module provides endpoints compatible with the client code and integrates
* with the existing account manager implementation.
* 
*/

const express = require('express');
const cors = require('cors');
const { logger } = require('../utils/logger');

/**
* Class for handling API requests to the account manager
* @class
*/
class ApiInterface {
    /**
     * Create a new ApiInterface instance
     * @constructor
     * @param {Object} accountManager - Reference to the RobloxAccountManager instance
     * @param {Object} options - Configuration options
     * @param {number} options.port - Port to listen on
     * @param {string|null} options.password - Password for API authentication
     */
    constructor(accountManager, options = {}) {
        /**
         * Reference to the RobloxAccountManager instance
         * @type {Object}
         * @private
         */
        this.accountManager = accountManager;

        /**
         * Port to listen on
         * @type {number}
         * @private
         */
        this.port = options.port || 8099;

        /**
         * Password for API authentication
         * @type {string|null}
         * @private
         */
        this.password = options.password || null;

        /**
         * Express app instance
         * @type {Object}
         * @private
         */
        this.app = express();

        /**
         * Express server instance
         * @type {Object}
         * @private
         */
        this.server = null;
    }

    /**
     * Initialize the API interface
     * @returns {Promise<void>}
     */
    async initialize() {
        // Configure Express
        this.app.use(cors());
        this.app.use(express.json());

        // Add authentication middleware if password is set
        if (this.password) {
            this.app.use(this.authMiddleware.bind(this));
            logger.info('API password protection enabled');
        }

        // Register API routes
        this.registerRoutes();

        // Start the server
        return new Promise((resolve) => {
            this.server = this.app.listen(this.port, () => {
                logger.info(`API server listening on port ${this.port}`);
                resolve();
            });
        });
    }

    /**
     * Authentication middleware to validate password
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next function
     * @private
     */
    authMiddleware(req, res, next) {
        const passwordParam = req.query.Password || req.query.password;

        // Exempt health check from password requirement
        if (req.path === '/health') {
            return next();
        }


        if (!passwordParam || passwordParam !== this.password) {
            logger.warn(`Unauthorized API access attempt from ${req.ip} to ${req.path}`);
            return res.status(401).send('Unauthorized: Invalid or missing password');
        }

        // Password is correct, proceed
        next();
    }

    /**
     * Register API routes
     * @private
     */
    registerRoutes() {
        // Get accounts (returns comma-separated list of account names)
        this.app.get('/GetAccounts', (req, res) => {
            try {
                const accounts = this.accountManager.listAccounts();
                const accountNames = accounts.map(account => account.username);
                res.send(accountNames.join(','));
            } catch (error) {
                logger.error('Error in GetAccounts:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Get accounts with detailed information (JSON format)
        this.app.get('/GetAccountsJson', (req, res) => {
            try {
                const accounts = this.accountManager.listAccounts();
                const group = req.query.Group;

                // If group is specified, filter accounts by group
                const filteredAccounts = group ?
                    accounts.filter(account => account.group === group) :
                    accounts;

                // Format accounts for response
                const formattedAccounts = filteredAccounts.map(account => ({
                    Username: account.username,
                    Alias: account.alias || '',
                    Description: account.description || '',
                    Group: account.group || 'Default'
                }));

                res.json(formattedAccounts);
            } catch (error) {
                logger.error('Error in GetAccountsJson:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Launch account in game
        this.app.get('/LaunchAccount', async (req, res) => {
            try {
                const { Account, PlaceId, JobId } = req.query;

                if (!Account || !PlaceId) {
                    return res.status(400).send('Account and PlaceId are required');
                }

                const result = await this.accountManager.launchGame(
                    Account,
                    PlaceId,
                    JobId || ''
                );

                if (result.success) {
                    res.send('Game launch initiated');
                } else {
                    res.status(400).send(result.message);
                }
            } catch (error) {
                logger.error('Error in LaunchAccount:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Set server to join
        this.app.get('/SetServer', async (req, res) => {
            try {
                const { Account, PlaceId, JobId } = req.query;

                if (!Account || !PlaceId || !JobId) {
                    return res.status(400).send('Account, PlaceId, and JobId are required');
                }

                // Store server info for account
                // This value will be used the next time the game is launched
                const success = this.accountManager.setNextServerForAccount(Account, PlaceId, JobId);

                if (success) {
                    res.send(`Server set: Account ${Account} will join server ${JobId} for place ${PlaceId}`);
                } else {
                    res.status(404).send(`Account ${Account} not found`);
                }
            } catch (error) {
                logger.error('Error in SetServer:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Get account alias
        this.app.get('/GetAlias', (req, res) => {
            try {
                const { Account } = req.query;

                if (!Account) {
                    return res.status(400).send('Account name is required');
                }

                const alias = this.accountManager.getAccountAlias(Account);
                res.send(alias || '');
            } catch (error) {
                logger.error('Error in GetAlias:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Get account description
        this.app.get('/GetDescription', (req, res) => {
            try {
                const { Account } = req.query;

                if (!Account) {
                    return res.status(400).send('Account name is required');
                }

                const description = this.accountManager.getAccountDescription(Account);
                res.send(description || '');
            } catch (error) {
                logger.error('Error in GetDescription:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Set account alias
        this.app.get('/SetAlias', (req, res) => {
            try {
                const { Account, Alias } = req.query;

                if (!Account) {
                    return res.status(400).send('Account name is required');
                }

                const success = this.accountManager.setAccountAlias(Account, Alias || '');

                if (success) {
                    res.send(`Alias set for account ${Account}`);
                } else {
                    res.status(404).send(`Account ${Account} not found`);
                }
            } catch (error) {
                logger.error('Error in SetAlias:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Set account description
        this.app.get('/SetDescription', (req, res) => {
            try {
                const { Account, Description } = req.query;

                if (!Account) {
                    return res.status(400).send('Account name is required');
                }

                const success = this.accountManager.setAccountDescription(Account, Description || '');

                if (success) {
                    res.send(`Description set for account ${Account}`);
                } else {
                    res.status(404).send(`Account ${Account} not found`);
                }
            } catch (error) {
                logger.error('Error in SetDescription:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Follow user
        this.app.get('/FollowUser', async (req, res) => {
            try {
                const { Account, Username } = req.query;

                if (!Account || !Username) {
                    return res.status(400).send('Account and Username are required');
                }

                // Get user ID from username using Roblox API
                try {
                    // Follow user is a special case of launching game
                    // where placeId is actually userId and followUser flag is true
                    const result = await this.accountManager.launchGame(
                        Account,
                        Username, // This will be resolved to user ID by Roblox
                        '', // No job ID needed
                        true // Set follow user flag
                    );

                    if (result.success) {
                        res.send(`Following user ${Username}`);
                    } else {
                        res.status(400).send(result.message);
                    }
                } catch (error) {
                    logger.error(`Error following user ${Username}:`, error);
                    res.status(400).send(`Error following user: ${error.message}`);
                }
            } catch (error) {
                logger.error('Error in FollowUser:', error);
                res.status(500).send('Internal server error');
            }
        });

        // Add a new account
        this.app.get('/AddAccount', async (req, res) => {
            try {
                const { Username, Password } = req.query;

                if (!Username || !Password) {
                    return res.status(400).send('Username and Password are required');
                }

                // Add account to manager
                try {
                    // This would normally log in and add the account
                    // Since we can't actually log in programmatically on macOS easily,
                    // we can add a placeholder account that will need to be logged in manually
                    const accountKey = await this.accountManager.addPlaceholderAccount(Username, Password);

                    if (accountKey) {
                        res.send(`Account ${Username} added successfully. Please log in manually.`);
                    } else {
                        res.status(400).send('Failed to add account');
                    }
                } catch (error) {
                    logger.error(`Error adding account ${Username}:`, error);
                    res.status(400).send(`Error adding account: ${error.message}`);
                }
            } catch (error) {
                logger.error('Error in AddAccount:', error);
                res.status(500).send('Internal server error');
            }
        });

        // API health check
        this.app.get('/health', (req, res) => {
            res.json({
                status: 'ok',
                accounts: Object.keys(this.accountManager.accounts).length,
                password_protected: !!this.password
            });
        });
    }

    /**
     * Stop the API server
     * @returns {Promise<void>}
     */
    async stop() {
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    logger.info('API server stopped');
                    this.server = null;
                    resolve();
                });
            });
        }
    }
}

module.exports = { ApiInterface };