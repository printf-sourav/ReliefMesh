import { beforeEach, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { initializeSharing } from './lib/mesh';
import { App as NativeApp } from '@capacitor/app';
import userEvent from '@testing-library/user-event';
vi.mock('./pages/dashboard', () => ({ default: () => <h1>Responder screen</h1> }));
vi.mock('./pages/report', () => ({ default: () => <h1>Citizen report screen</h1> }));
vi.mock('./pages/queue', () => ({ default: () => <h1>Saved reports screen</h1> }));
vi.mock('./lib/mesh', () => ({ initializeSharing: vi.fn().mockResolvedValue(() => {}) }));
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }) } }));
beforeEach(() => {
  vi.stubEnv('VITE_APP_MODE', ''); vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
  vi.mocked(initializeSharing).mockResolvedValue(() => {});
  vi.mocked(NativeApp.addListener).mockResolvedValue({ remove: vi.fn() });
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
function open(path: string) { render(<MemoryRouter initialEntries={[path]}><App/></MemoryRouter>); }
it('keeps citizen routes and actions out of the responder website', async () => {
  open('/report');
  expect(await screen.findByRole('heading', { name: 'Responder screen' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Report' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'My reports' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: /New report/ })).not.toBeInTheDocument();
});
it('opens Android on reporting and hides responder routes', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true); open('/dashboard');
  expect(await screen.findByRole('heading', { name: 'Citizen report screen' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Report' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'My reports' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Transport online|Simulated hub/)).not.toBeInTheDocument();
});
it('keeps saved reports available in Android', async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true); open('/queue');
  expect(await screen.findByRole('heading', { name: 'Saved reports screen' })).toBeInTheDocument();
  vi.mocked(window.scrollTo).mockClear();
  await userEvent.click(screen.getByRole('link', { name: 'Report' }));
  expect(await screen.findByRole('heading', { name: 'Citizen report screen' })).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalledWith(0,0);
});
it('allows an explicit citizen preview without changing the default website', async () => {
  vi.stubEnv('VITE_APP_MODE', 'citizen'); open('/');
  expect(await screen.findByRole('heading', { name: 'Citizen report screen' })).toBeInTheDocument();
});
