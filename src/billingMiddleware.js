/**
 * Billing Middleware *  to verify billing-related information before proceeding with the request.
 *
 * @param {string} apiUrl - The URL of the API to fetch user information.
 * @param {string} billingUrl - The URL of the billing system to retrieve user balances.
 * @param {string} billingApiKey - API Key used for authentication when fetching user details.
 */
const fetch = require('node-fetch');
const ourServices = require('./services');

class BillingMiddleware {
    /**
     * Billing Middleware class.
     *
     * @class BillingMiddleware
     * @param {string} apiUrl - The URL of the API to fetch user information.
     * @param {string} billingUrl - The URL of the billing system to retrieve user balances.
     * @param {string} billingApiKey - API Key used for authentication when fetching user details.
     */

    constructor(apiUrl, billingUrl, billingApiKey) {
        this.apiUrl = apiUrl;
        this.billingUrl = billingUrl;
        this.billingApiKey = billingApiKey;
    }

    /**
     * Verify Billing Middleware Function
     * @param {string} serviceId - The ID of the service for which the billing is being verified.
     * @returns {function} Middleware function to validate billing.
     */
    verifyBilling(serviceId) {
        return async (req, res, next) => {
            try {
                // Step 1: Validate API Key
                const apiKey = req.headers['x-api-key'];
                if (!apiKey) {
                    return res.status(401).send('Unauthorized: Missing API Key');
                }

                // Step 2: Retrieve or extract userId
                let userId = req.headers['user-id'];
                if (!userId) {
                    const user = await this.getUserByApiKey(apiKey);
                    if (!user || !user.userId) {
                        return res.status(401).send('Unauthorized: Invalid API Key');
                    }
                    userId = user.userId.toString();
                    req.headers['user-id'] = userId;
                }

                // Step 3: Validate Service ID
                if (!this.isValidServiceId(serviceId)) {
                    return res.status(400).send('Invalid Service ID');
                }

                // Step 4: Retrieve user balance
                const userBalance = await this.getUserBalance(userId);

                // Step 5: Check if user has enough balance for the service
                if (userBalance < ourServices[serviceId].unit_price) {
                    return res.status(402).send('Insufficient Balance');
                }

                next();
            } catch (error) {
                console.error('Error occurred in verifyBilling:', error);
                res.status(500).send({
                    message: 'Internal Server Error',
                    error: error.message,
                });
            }
        };
    }

    /**
     * Retrieve user details by API key.
     * @param {string} apiKey - The API key used to fetch user details.
     * @returns {Promise<object>} User information.
     */
    async getUserByApiKey(apiKey) {
        const response = await fetch(`${this.apiUrl}/api-key/getUserByHashKey`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user by API key');
        }
        return response.json();
    }

    /**
     * Check if the service ID is valid.
     * @param {string} serviceId - The service ID to validate.
     * @returns {boolean} Whether the service ID is valid or not.
     */
    isValidServiceId(serviceId) {
        return !!serviceId && !!ourServices[serviceId];
    }

    /**
     * Retrieve user balance.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<number>} The balance of the user.
     */
    async getUserBalance(userId) {
        const response = await fetch(`${this.billingUrl}/billing/${userId}/balance`,{
            method: 'GET',
            headers: {
                'x-api-key': this.billingApiKey,
            },
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user balance');
        }
        const data = await response.json();
        return data.balance;
    }
}

module.exports = BillingMiddleware;

module.exports.default = BillingMiddleware;