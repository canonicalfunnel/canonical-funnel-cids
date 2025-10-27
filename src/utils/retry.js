'use strict';

const { logger } = require('./logger');

async function sleep(duration) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}

async function withRetry(task, options = {}) {
  const {
    retries = 3,
    delay = 250,
    onRetry,
    component = 'retry',
  } = options;

  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt === retries) {
        break;
      }

      const nextDelay =
        typeof delay === 'function' ? delay(attempt + 1) : delay;

      logger.warn('Retrying task after failure', {
        component,
        attempt: attempt + 1,
        retries,
        error: error && error.message ? error.message : String(error),
        delay: nextDelay,
      });

      if (typeof onRetry === 'function') {
        try {
          onRetry(error, attempt + 1);
        } catch (hookError) {
          logger.error('Retry hook threw an error', {
            component,
            hookError: hookError && hookError.message ? hookError.message : String(hookError),
          });
        }
      }

      await sleep(nextDelay);
    }

    attempt += 1;
  }

  const failure = lastError instanceof Error ? lastError : new Error(String(lastError));
  failure.attempts = attempt;
  throw failure;
}

module.exports = {
  withRetry,
};
