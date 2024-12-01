// Import BillingMiddleware and ourServices
const BillingMiddleware = require('./billingMiddleware');
const ourServices = require('./services');

// Export both BillingMiddleware and ourServices for easy access
module.exports = { BillingMiddleware, ourServices };

// Compatibility with ES Modules
module.exports.default = { BillingMiddleware, ourServices };
