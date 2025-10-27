'use strict';

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

const METHODS = {
  error: 'error',
  warn: 'warn',
  info: 'info',
  debug: 'debug',
};

const defaultLevel =
  process.env.LOG_LEVEL ||
  (process.env.NODE_ENV && process.env.NODE_ENV !== 'production'
    ? 'debug'
    : 'info');

let currentLevel = normalizeLevel(defaultLevel);

function normalizeLevel(level) {
  if (!level) {
    return 'info';
  }

  const normalized = level.toLowerCase();
  if (LEVELS[normalized] === undefined) {
    return 'info';
  }

  return normalized;
}

function setLogLevel(level) {
  currentLevel = normalizeLevel(level);
}

function formatContext(context) {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  return context;
}

function shouldLog(level) {
  return LEVELS[level] <= LEVELS[currentLevel];
}

function log(level, message, context) {
  const normalizedLevel = normalizeLevel(level);
  if (!shouldLog(normalizedLevel)) {
    return;
  }

  const payload = formatContext(context);
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] [${normalizedLevel.toUpperCase()}] ${message}`;
  const method = METHODS[normalizedLevel] || 'log';

  if (payload) {
    console[method](entry, payload);
    return;
  }

  console[method](entry);
}

function createLogger(component, baseContext = {}) {
  const componentContext =
    component || baseContext.component
      ? {
          ...baseContext,
          ...(component ? { component } : {}),
        }
      : baseContext;

  return {
    debug(message, context) {
      log('debug', message, { ...componentContext, ...context });
    },
    info(message, context) {
      log('info', message, { ...componentContext, ...context });
    },
    warn(message, context) {
      log('warn', message, { ...componentContext, ...context });
    },
    error(message, context) {
      log('error', message, { ...componentContext, ...context });
    },
    child(childContext = {}) {
      return createLogger(component, { ...componentContext, ...childContext });
    },
  };
}

const logger = createLogger('core');

module.exports = {
  logger,
  createLogger,
  setLogLevel,
};
