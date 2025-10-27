'use strict';

const { createLogger, logger, setLogLevel } = require('../../src/utils/logger');

describe('logger utility', () => {
  let originalLevel;
  let consoleSpy;

  beforeEach(() => {
    originalLevel = process.env.LOG_LEVEL;
    consoleSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    setLogLevel('debug');
  });

  afterEach(() => {
    if (originalLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLevel;
    }
    jest.restoreAllMocks();
  });

  it('logs messages at or above the active level', () => {
    logger.info('Hello world');
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] Hello world'),
      expect.objectContaining({ component: 'core' }),
    );
  });

  it('suppresses lower priority logs after level change', () => {
    setLogLevel('error');
    logger.info('This should be ignored');
    expect(console.info).not.toHaveBeenCalled();
  });

  it('creates child loggers that merge context', () => {
    const child = createLogger('main').child({ requestId: '123' });
    child.debug('Test', { action: 'check' });
    expect(console.debug).toHaveBeenCalledWith(
      expect.stringContaining('[DEBUG] Test'),
      expect.objectContaining({ component: 'main', requestId: '123', action: 'check' }),
    );
  });

  it('normalizes unknown log levels back to info', () => {
    setLogLevel('unknown-level');
    logger.info('Still logs');
    expect(console.info).toHaveBeenCalled();
  });

  it('handles uppercase level settings', () => {
    setLogLevel('WARN');
    logger.warn('Warned');
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] Warned'),
      expect.objectContaining({ component: 'core' }),
    );
  });

  it('omits payload when context is not an object', () => {
    const bareLogger = createLogger();
    setLogLevel('info');

    bareLogger.info('No context', null);

    expect(console.info).toHaveBeenCalled();
    const call = console.info.mock.calls.at(-1);
    expect(call[0]).toContain('No context');
    expect(call[1]).toEqual({});
  });

  it('inherits component from base context when none is provided', () => {
    const baseLogger = createLogger(undefined, { component: 'base' });
    baseLogger.info('Base context');

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] Base context'),
      expect.objectContaining({ component: 'base' }),
    );
  });
});
