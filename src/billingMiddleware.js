import ourServices from "./services";

class BillingMiddleware {
    constructor(apiUrl, billingUrl) {
        this.apiUrl = apiUrl;
        this.billingUrl = billingUrl;
    }

    verifyBilling(serviceId) {
        return async (req, res, next) => {
            try {
                // Step 1: Validate API Key
                const apiKey = req.headers['x-api-key'];
                if (!apiKey) {
                    res.status(401).send('Unauthorized: Missing API Key');
                    return;
                }

                // Step 2: Retrieve or extract userId
                let userId = req.headers['userId'];
                if (!userId) {
                    const user = await this.getUserByApiKey(apiKey);
                    if (!user || !user.userId) {
                        res.status(401).send('Unauthorized: Invalid API Key');
                        return;
                    }
                    userId = user.userId.toString();
                    req.headers['userId'] = userId;
                }

                // Step 3: Validate Service ID
                if (!this.isValidServiceId(serviceId)) {
                    res.status(400).send('Invalid Service ID');
                    return;
                }

                // Step 4: Retrieve user balance
                const userBalance = await this.getUserBalance(userId);

                // Step 5: Check if user has enough balance for the service
                if (userBalance < ourServices[serviceId].unit_price) {
                    res.status(402).send('Insufficient Balance');
                    return;
                }

                next();
            } catch (error) {
                res.status(500).send('Internal Server Error');
            }
        };
    }

    async getUserByApiKey(apiKey) {
        const response = await fetch(`${this.apiUrl}/api-key/getUserByHashKey`,{
            method:"GET",
            headers: {
                'x-api-key': apiKey
            }
        });
        if (!response.ok) {
            throw new Error('Failed to fetch user by API key');
        }
        return response.json();
    }

    isValidServiceId(serviceId) {
        return !!serviceId && !!ourServices[serviceId];
    }

    async getUserBalance(userId) {
        const response = await fetch(`${this.billingUrl}/billing/${userId}/balance`);
        if (!response.ok) {
            throw new Error('Failed to fetch user balance');
        }
        const data = await response.json();
        return data.balance;
    }
}


module.exports = BillingMiddleware;

module.exports.default = BillingMiddleware;