// Import BillingMiddleware and ourServices
const Billing = require('./billing');
const ourServices = require('./services');

// Export both BillingMiddleware and ourServices for easy access
module.exports = { Billing, ourServices };

// Compatibility with ES Modules
module.exports.default = { Billing, ourServices };
