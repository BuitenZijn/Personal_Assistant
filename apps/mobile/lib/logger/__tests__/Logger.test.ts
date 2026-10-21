/**
 * The log file is written from the JS thread on every GPS update, so these
 * tests pin down how much work a write does, not just what ends up on disk.
 */

type MockFs = {
  files: Map<string, string>
  write: jest.Mock
  textSync: jest.Mock
}

jest.mock('expo-file-system', () => {
  const files = new Map<string, string>()
  const toUri = (parts: unknown[]) =>
    parts
      .map(part =>
        typeof part === 'string' ? part : (part as { uri: string }).uri,
      )
      .join('/')
  const write = jest.fn()
  const textSync = jest.fn()

  class Directory {
    uri: string
    constructor(...parts: unknown[]) {
      this.uri = toUri(parts)
    }
    get exists() {
      return true
    }
    create() {}
    list() {
      return []
    }
  }
  class File {
    uri: string
    constructor(...parts: unknown[]) {
      this.uri = toUri(parts)
    }
    get exists() {
      return files.has(this.uri)
    }
    get size() {
      return (files.get(this.uri) ?? '').length
    }
    create() {
      files.set(this.uri, '')
    }
    write(content: string, options?: { append?: boolean }) {
      write(content, options)
      files.set(
        this.uri,
        options?.append ? (files.get(this.uri) ?? '') + content : content,
      )
    }
    textSync() {
      textSync()
      return files.get(this.uri) ?? ''
    }
    async text() {
      return files.get(this.uri) ?? ''
    }
    delete() {
      files.delete(this.uri)
    }
    moveSync(destination: { uri: string }) {
      files.set(destination.uri, files.get(this.uri) ?? '')
      files.delete(this.uri)
    }
    async move(destination: { uri: string }) {
      this.moveSync(destination)
    }
  }
  return {
    File,
    Directory,
    Paths: { document: 'file:///documents' },
    __fs: { files, write, textSync },
  }
})

const CURRENT_LOG = 'file:///documents/logs/current.log'

function mockFs(): MockFs {
  return jest.requireMock<{ __fs: MockFs }>('expo-file-system').__fs
}

function loadLogger(isDev: boolean) {
  const globals = globalThis as unknown as { __DEV__: boolean }
  const previous = globals.__DEV__
  globals.__DEV__ = isDev
  let loaded: typeof import('../Logger') | undefined
  // A fresh copy, so the module-level `__DEV__` default is read again.
  jest.isolateModules(() => {
    loaded = jest.requireActual<typeof import('../Logger')>('../Logger')
  })
  globals.__DEV__ = previous
  return { ...loaded!, fs: mockFs() }
}

beforeAll(() => {
  ;(globalThis as unknown as { ErrorUtils: unknown }).ErrorUtils = {
    getGlobalHandler: () => undefined,
    setGlobalHandler: () => undefined,
  }
})
beforeEach(() => {
  jest.useFakeTimers()
  const fs = mockFs()
  fs.files.clear()
  fs.write.mockClear()
  fs.textSync.mockClear()
})
afterEach(() => {
  jest.useRealTimers()
})

it('appends new entries instead of reading and rewriting the whole file', async () => {
  const { Logger, fs } = loadLogger(true)
  const logger = new Logger({ enableConsole: false })
  await logger.initialize()
  fs.files.set(CURRENT_LOG, 'x'.repeat(1_000_000))

  logger.info('Gps', 'fix 1')
  logger.info('Gps', 'fix 2')
  await jest.advanceTimersByTimeAsync(1_000)

  expect(fs.textSync).not.toHaveBeenCalled()
  const appended = fs.write.mock.calls.filter(([, options]) => options?.append)
  expect(appended.length).toBeGreaterThan(0)
  expect(fs.write.mock.calls.every(([, options]) => options?.append)).toBe(true)
  const written = appended.map(([content]) => content).join('')
  expect(written).toContain('[Gps] fix 1')
  expect(written).toContain('[Gps] fix 2')
  expect(fs.files.get(CURRENT_LOG)).toMatch(/^x{1000000}/)
})

it('keeps debug entries out of the log file in production builds', async () => {
  const { Logger, fs } = loadLogger(false)
  const logger = new Logger({ enableConsole: false })
  await logger.initialize()

  logger.debug('Gps', 'noisy detail')
  logger.warn('Sync', 'worth keeping')
  await jest.advanceTimersByTimeAsync(1_000)

  const file = fs.files.get(CURRENT_LOG) ?? ''
  expect(file).toContain('[Sync] worth keeping')
  expect(file).not.toContain('noisy detail')
  // Still visible in the in-app log viewer.
  expect(logger.getMemoryLogs().map(entry => entry.message)).toContain(
    'noisy detail',
  )
})

it('writes debug entries to the file in development builds', async () => {
  const { Logger, fs } = loadLogger(true)
  const logger = new Logger({ enableConsole: false })
  await logger.initialize()
  logger.debug('Gps', 'noisy detail')
  await jest.advanceTimersByTimeAsync(1_000)
  expect(fs.files.get(CURRENT_LOG)).toContain('noisy detail')
})

it('keeps a bounded in-memory buffer, newest first', () => {
  const { Logger } = loadLogger(true)
  const logger = new Logger({ enableConsole: false, maxMemoryLogs: 3 })
  for (let i = 1; i <= 5; i++) logger.info('T', `entry ${i}`)

  expect(logger.getMemoryLogs().map(entry => entry.message)).toEqual([
    'entry 5',
    'entry 4',
    'entry 3',
  ])
  expect(logger.getMemoryLogs(2).map(entry => entry.message)).toEqual([
    'entry 5',
    'entry 4',
  ])
})

it('bounds the default in-memory buffer', () => {
  const { Logger } = loadLogger(true)
  const logger = new Logger({ enableConsole: false })
  for (let i = 0; i < 20_000; i++) logger.debug('Gps', `fix ${i}`)
  const logs = logger.getMemoryLogs()
  expect(logs.length).toBeLessThanOrEqual(10_000)
  expect(logs[0].message).toBe('fix 19999')
})

it('exports pending entries along with what is already on disk', async () => {
  const { Logger, fs } = loadLogger(true)
  const logger = new Logger({ enableConsole: false })
  await logger.initialize()
  logger.info('A', 'first')
  await jest.advanceTimersByTimeAsync(1_000)
  logger.error('B', 'second')

  const uri = await logger.exportLogs()
  const exported = fs.files.get(uri) ?? ''
  expect(exported).toContain('XPLORER DEBUG LOGS')
  expect(exported).toContain('[A] first')
  expect(exported).toContain('[B] second')
})
