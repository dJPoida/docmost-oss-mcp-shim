export const DEBUG = process.env.DEBUG_SHIM === '1';
export const log = (...args: any[]): void => {
  if (DEBUG) {
    console.log('[shim]', ...args);
  }
};
