import { expect, it, vi } from 'vitest';
import { createReportId } from './draft';
it('creates a valid random v4 UUID on LAN browser contexts lacking randomUUID', () => {
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  vi.stubGlobal('crypto',{ getRandomValues });
  const first = createReportId(), second = createReportId();
  expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(first).not.toBe(second); vi.unstubAllGlobals();
});
