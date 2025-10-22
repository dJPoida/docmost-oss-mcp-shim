export const DEBUG = process.env.DEBUG_SHIM === '1';
export const log = (...args) => {
    if (DEBUG) {
        console.log('[shim]', ...args);
    }
};
//# sourceMappingURL=logger.js.map