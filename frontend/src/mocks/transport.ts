import { ApiError } from '../lib/api';
export async function mockRequest<T>(path: string, _init?: RequestInit): Promise<T> {
  if (path === '/health') return { status:'ok', ai_mode:'fixture', model_id:'illustrative-development-fixture' } as T;
  throw new ApiError('FIXTURE_NOT_IMPLEMENTED', 'This fixture route is not implemented yet.', 503);
}
