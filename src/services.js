// src/services.js

const ourServices = {
    'flash-call': {
        service_id: 'flash-call',
        unit_price: 0.05
    },
    'otp-call': {
        service_id: 'otp-call',
        unit_price: 0.03
    },
    'text-to-speech': {
        service_id: 'text-to-speech',
        unit_price: 0.04
    }
};

// CommonJS export (for require)
module.exports = ourServices;

// ESM export (for import)
export default ourServices;