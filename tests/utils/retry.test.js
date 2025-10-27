'use strict';

const { withRetry } = require('../../src/utils/retry');

describe('withRetry', () => {
  it('resolves when task succeeds without retries', async () => {
    const task = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(task, { retries: 1 });
    expect(result).toBe('ok');
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('retries failing tasks and eventually resolves', async () => {
    const task = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');

    const onRetry = jest.fn();
    const resultPromise = withRetry(task, {
      retries: 2,
      delay: 1,
      onRetry,
      component: 'retry-test',
    });

    await resultPromise;

    expect(task).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it('throws after exhausting retries', async () => {
    const task = jest.fn().mockRejectedValue(new Error('permanent'));

    await expect(
      withRetry(task, { retries: 1, delay: 1 }),
    ).rejects.toThrow('permanent');
    expect(task).toHaveBeenCalledTimes(2);
  });

  it('accepts functional delays and guards retry hook failures', async () => {
    const task = jest
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('ok');

    const onRetry = jest.fn(() => {
      throw new Error('hook error');
    });

    const result = await withRetry(task, {
      retries: 2,
      delay: (attempt) => attempt,
      onRetry,
    });

    expect(result).toBe('ok');
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });
});
