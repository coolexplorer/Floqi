import { vi } from 'vitest'

type ChainResult = { data: unknown; error: unknown }

/**
 * Creates a fluent query chain mock (select/insert/update/delete/upsert -> eq/in/order/limit).
 * All terminal methods resolve with the provided result.
 */
export function makeChain(result: ChainResult = { data: null, error: null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const methods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'in', 'order', 'limit', 'single', 'maybeSingle']

  for (const method of methods) {
    chain[method] = vi.fn().mockReturnValue(chain)
  }

  // Make it thenable so await works
  Object.defineProperty(chain, 'then', {
    value: (resolve: (value: ChainResult) => void) => Promise.resolve(result).then(resolve),
    writable: true,
    configurable: true,
  })

  return chain
}

/**
 * Creates a mock Supabase client for browser-side tests.
 * Returns { mockGetUser, mockFrom, chain }
 */
export function createClientMock(opts?: {
  user?: { id: string } | null
  fromResult?: ChainResult
}) {
  const user = opts?.user ?? { id: 'user-123' }
  const fromResult = opts?.fromResult ?? { data: null, error: null }

  const mockGetUser = vi.fn().mockResolvedValue({
    data: { user },
    error: user ? null : { message: 'Not authenticated' },
  })

  const chain = makeChain(fromResult)
  const mockFrom = vi.fn().mockReturnValue(chain)

  return { mockGetUser, mockFrom, chain }
}

/**
 * Creates a mock Supabase server client.
 * Same as createClientMock but intended for server component mocks.
 */
export function createServerClientMock(opts?: {
  user?: { id: string } | null
  fromResult?: ChainResult
}) {
  return createClientMock(opts)
}
