import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { LogLevel } from '@/lib/config/env';
import { createLogger, type Logger } from '@/lib/logger';

const FIXED_TIME = '2026-11-02T12:00:00.000Z';
const logEntrySchema = z.record(z.string(), z.unknown());

function captureLogs(minLevel: LogLevel = LogLevel.Debug): { logger: Logger; entries: () => Record<string, unknown>[] } {
  const lines: string[] = [];
  const logger = createLogger({
    minLevel,
    write: (line) => lines.push(line),
    now: () => new Date(FIXED_TIME),
  });
  return { logger, entries: () => lines.map((line) => logEntrySchema.parse(JSON.parse(line))) };
}

describe('createLogger', () => {
  it('writes one structured JSON line per event', () => {
    const { logger, entries } = captureLogs();

    logger.info('match.completed', { matchId: 'm1', durationMs: 42 });

    expect(entries()).toEqual([
      { timestamp: FIXED_TIME, level: 'info', event: 'match.completed', matchId: 'm1', durationMs: 42 },
    ]);
  });

  it('drops events below the minimum level', () => {
    const { logger, entries } = captureLogs(LogLevel.Warn);

    logger.debug('a');
    logger.info('b');
    logger.warn('c');
    logger.error('d');

    expect(entries().map((entry) => entry.event)).toEqual(['c', 'd']);
  });

  it('does not let fields overwrite reserved keys', () => {
    const { logger, entries } = captureLogs();

    logger.info('real.event', { event: 'fake', level: 'fake', timestamp: 'fake' });

    expect(entries()[0]).toEqual({ timestamp: FIXED_TIME, level: 'info', event: 'real.event' });
  });

  it('redacts sensitive keys at any depth', () => {
    const { logger, entries } = captureLogs();

    logger.info('call', {
      apiKey: 'leak-1',
      api_key: 'leak-2',
      nested: { Authorization: 'leak-3', items: [{ sessionToken: 'leak-4' }] },
      DATABASE_URL: 'leak-5',
      matchId: 'visible',
    });

    const line = JSON.stringify(entries()[0]);
    expect(line).not.toMatch(/leak-\d/);
    expect(line).toContain('visible');
  });

  it('serializes errors with their cause', () => {
    const { logger, entries } = captureLogs();

    logger.error('load.failed', { error: new Error('outer', { cause: new TypeError('inner') }) });

    expect(entries()[0]?.error).toMatchObject({
      name: 'Error',
      message: 'outer',
      cause: { name: 'TypeError', message: 'inner' },
    });
  });

  it('handles values JSON cannot represent', () => {
    const { logger, entries } = captureLogs();
    const circular: Record<string, unknown> = { name: 'loop' };
    circular.self = circular;
    const shared = { id: 1 };

    logger.info('odd', { circular, big: 10n, at: new Date(FIXED_TIME), first: shared, second: shared });

    expect(entries()[0]).toMatchObject({
      circular: { name: 'loop', self: '[Circular]' },
      big: '10',
      at: FIXED_TIME,
      first: { id: 1 },
      second: { id: 1 },
    });
  });

  it('never throws, and still logs the event when fields fail', () => {
    const { logger, entries } = captureLogs();
    const hostile = {
      get boom(): never {
        throw new Error('getter failed');
      },
    };

    expect(() => {
      logger.error('still.logged', { hostile });
    }).not.toThrow();
    expect(entries()[0]).toMatchObject({ event: 'still.logged', fieldsDropped: true });
  });
});
