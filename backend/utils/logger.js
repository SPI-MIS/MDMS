// Simple logger wrapper to control log level in production
const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const envLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
const currentLevel = LEVELS[envLevel] !== undefined ? envLevel : 'info';

function shouldLog(level) {
  return LEVELS[level] <= LEVELS[currentLevel];
}

module.exports = {
  debug: (...args) => { if (shouldLog('debug')) console.debug(...args); },
  info: (...args) => { if (shouldLog('info')) console.info(...args); },
  warn: (...args) => { if (shouldLog('warn')) console.warn(...args); },
  error: (...args) => { if (shouldLog('error')) console.error(...args); }
};
