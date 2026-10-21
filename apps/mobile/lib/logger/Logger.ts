import { File, Directory, Paths } from 'expo-file-system'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  tag: string
  message: string
  data?: unknown
  sessionId: string
}

interface LoggerConfig {
  maxMemoryLogs: number
  maxFileSizeMB: number
  retentionDays: number
  enableFileLogging: boolean
  enableConsole: boolean
  /** Least severe level written to the log file. */
  minFileLevel: LogLevel
}

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Debug entries arrive with every GPS update. Release builds keep them in
// memory for the log viewer but don't pay to write them to disk.
const DEFAULT_MIN_FILE_LEVEL: LogLevel = __DEV__ ? 'debug' : 'info'

function defaultConfig(): LoggerConfig {
  return {
    // The in-app viewer shows a few hundred entries; this is room to filter.
    maxMemoryLogs: 5000,
    // Export reads the current file into memory, so keep it modest.
    maxFileSizeMB: 10,
    retentionDays: 7,
    enableFileLogging: true,
    enableConsole: true,
    minFileLevel: DEFAULT_MIN_FILE_LEVEL,
  }
}

/** Pending entries are written together, at most this often. */
const WRITE_INTERVAL_MS = 250

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

function getLogDirectory(): Directory | null {
  const documentPath = Paths?.document
  if (!documentPath) {
    return null
  }
  return new Directory(documentPath, 'logs')
}

function getCurrentLogFile(): File | null {
  const directory = getLogDirectory()
  if (!directory) {
    return null
  }
  return new File(directory, 'current.log')
}

/**
 * Production Logger with file persistence
 *
 * Features:
 * - Circular in-memory buffer for recent logs
 * - Persistent file storage with rotation, appended to in batches
 * - Session tracking for crash correlation
 * - Global error capture
 * - Exportable log files
 */
export class Logger {
  private config: LoggerConfig
  /** Ring buffer: `memoryStart` is the oldest entry once it has wrapped. */
  private memoryLogs: LogEntry[] = []
  private memoryStart = 0
  private writeQueue: LogEntry[] = []
  private writeTimer: ReturnType<typeof setTimeout> | null = null
  private initialized = false
  private originalConsole: {
    log: typeof console.log
    info: typeof console.info
    warn: typeof console.warn
    error: typeof console.error
    debug: typeof console.debug
  }

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...defaultConfig(), ...config }
    // Store original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    }
  }

  /**
   * Initialize the logger - must be called before logging to files
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      const logDirectory = getLogDirectory()
      if (!logDirectory) {
        this.config.enableFileLogging = false
        this.installGlobalErrorHandler()
        this.initialized = true
        this.info('Logger', 'Logger initialized (memory-only mode)', {
          sessionId: SESSION_ID,
        })
        return
      }

      // Ensure log directory exists
      if (!logDirectory.exists) {
        logDirectory.create({ intermediates: true })
      }

      // Clean up old logs
      await this.cleanupOldLogs()

      // Install global error handler
      this.installGlobalErrorHandler()

      this.initialized = true
      this.info('Logger', 'Logger initialized', { sessionId: SESSION_ID })
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to initialize:', error)
    }
  }

  /**
   * Intercept console methods to capture all logs
   */
  interceptConsole(): void {
    console.log = (...args: unknown[]) => {
      this.captureConsoleLog('info', args)
      if (this.config.enableConsole) {
        this.originalConsole.log(...args)
      }
    }

    console.info = (...args: unknown[]) => {
      this.captureConsoleLog('info', args)
      if (this.config.enableConsole) {
        this.originalConsole.info(...args)
      }
    }

    console.warn = (...args: unknown[]) => {
      this.captureConsoleLog('warn', args)
      if (this.config.enableConsole) {
        this.originalConsole.warn(...args)
      }
    }

    console.error = (...args: unknown[]) => {
      this.captureConsoleLog('error', args)
      if (this.config.enableConsole) {
        this.originalConsole.error(...args)
      }
    }

    console.debug = (...args: unknown[]) => {
      this.captureConsoleLog('debug', args)
      if (this.config.enableConsole) {
        this.originalConsole.debug(...args)
      }
    }
  }

  /**
   * Restore original console methods
   */
  restoreConsole(): void {
    console.log = this.originalConsole.log
    console.info = this.originalConsole.info
    console.warn = this.originalConsole.warn
    console.error = this.originalConsole.error
    console.debug = this.originalConsole.debug
  }

  private captureConsoleLog(level: LogLevel, args: unknown[]): void {
    // Parse tag from first argument if it matches [Tag] pattern
    const firstArg = args[0]
    let tag = 'Console'
    let message: string
    let data: unknown

    if (typeof firstArg === 'string') {
      const tagMatch = firstArg.match(/^\[([^\]]+)\]\s*(.*)/)
      if (tagMatch) {
        tag = tagMatch[1]
        message = tagMatch[2] || ''
        data = args.length > 1 ? args.slice(1) : undefined
      } else {
        message = args.map(a => this.stringify(a)).join(' ')
      }
    } else {
      message = args.map(a => this.stringify(a)).join(' ')
    }

    this.log(level, tag, message, data)
  }

  private stringify(value: unknown): string {
    if (value === null) return 'null'
    if (value === undefined) return 'undefined'
    if (typeof value === 'string') return value
    if (typeof value === 'number' || typeof value === 'boolean')
      return String(value)
    if (value instanceof Error) {
      return `${value.name}: ${value.message}\n${value.stack || ''}`
    }
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    tag: string,
    message: string,
    data?: unknown,
  ): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      tag,
      message,
      data,
      sessionId: SESSION_ID,
    }

    // Add to memory buffer. Once full, overwrite the oldest slot: shifting a
    // large array on every log line is O(n) work on the JS thread.
    if (this.memoryLogs.length < this.config.maxMemoryLogs) {
      this.memoryLogs.push(entry)
    } else {
      this.memoryLogs[this.memoryStart] = entry
      this.memoryStart = (this.memoryStart + 1) % this.memoryLogs.length
    }

    // Queue for file writing
    if (
      this.config.enableFileLogging &&
      this.initialized &&
      LEVEL_RANK[level] >= LEVEL_RANK[this.config.minFileLevel]
    ) {
      this.writeQueue.push(entry)
      this.scheduleWrite()
    }
  }

  // Public logging methods
  debug(tag: string, message: string, data?: unknown): void {
    this.log('debug', tag, message, data)
    if (this.config.enableConsole) {
      this.originalConsole.debug(`[${tag}] ${message}`, data ?? '')
    }
  }

  info(tag: string, message: string, data?: unknown): void {
    this.log('info', tag, message, data)
    if (this.config.enableConsole) {
      this.originalConsole.info(`[${tag}] ${message}`, data ?? '')
    }
  }

  warn(tag: string, message: string, data?: unknown): void {
    this.log('warn', tag, message, data)
    if (this.config.enableConsole) {
      this.originalConsole.warn(`[${tag}] ${message}`, data ?? '')
    }
  }

  error(tag: string, message: string, data?: unknown): void {
    this.log('error', tag, message, data)
    if (this.config.enableConsole) {
      this.originalConsole.error(`[${tag}] ${message}`, data ?? '')
    }
  }

  /**
   * Log an error with stack trace
   */
  captureException(
    error: Error,
    tag = 'Exception',
    context?: Record<string, unknown>,
  ): void {
    this.error(tag, `${error.name}: ${error.message}`, {
      stack: error.stack,
      ...context,
    })
  }

  /**
   * Get logs from memory (most recent first)
   */
  getMemoryLogs(limit?: number): LogEntry[] {
    const count = Math.min(limit ?? Infinity, this.memoryLogs.length)
    const logs: LogEntry[] = []
    const size = this.memoryLogs.length
    // Newest is just before the oldest slot.
    for (let i = 1; i <= count; i++) {
      logs.push(this.memoryLogs[(this.memoryStart - i + size) % size])
    }
    return logs
  }

  /**
   * Get current session ID
   */
  getSessionId(): string {
    return SESSION_ID
  }

  /**
   * Read all logs from current log file
   */
  async readLogFile(): Promise<string> {
    try {
      const currentLogFile = getCurrentLogFile()
      if (!currentLogFile || !currentLogFile.exists) {
        return ''
      }
      return await currentLogFile.text()
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to read log file:', error)
      return ''
    }
  }

  /**
   * Get the path to the current log file for sharing
   */
  getLogFilePath(): string {
    const currentLogFile = getCurrentLogFile()
    if (!currentLogFile) {
      throw new Error('Log file path is unavailable in this runtime')
    }
    return currentLogFile.uri
  }

  /**
   * Export logs to a shareable file and return its path
   */
  async exportLogs(): Promise<string> {
    const logDirectory = getLogDirectory()
    if (!logDirectory) {
      throw new Error('Log export is unavailable in this runtime')
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const exportFile = new File(logDirectory, `xplorer-logs-${timestamp}.log`)

    try {
      // Flush any pending writes
      this.flushWriteQueue()

      // Read current log file
      const currentLogs = await this.readLogFile()

      // Add session info header
      const header = [
        '='.repeat(60),
        'XPLORER DEBUG LOGS',
        `Export Time: ${new Date().toISOString()}`,
        `Session ID: ${SESSION_ID}`,
        '='.repeat(60),
        '',
      ].join('\n')

      // Write to export file
      exportFile.create()
      exportFile.write(header + currentLogs)

      return exportFile.uri
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to export logs:', error)
      throw error
    }
  }

  /**
   * Clear all logs
   */
  async clearLogs(): Promise<void> {
    this.memoryLogs = []
    this.memoryStart = 0
    this.writeQueue = []

    try {
      const currentLogFile = getCurrentLogFile()
      if (currentLogFile?.exists) {
        currentLogFile.delete()
      }
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to clear log file:', error)
    }
  }

  private scheduleWrite(): void {
    if (this.writeTimer) return
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null
      this.writePending()
    }, WRITE_INTERVAL_MS)
  }

  /**
   * Append everything queued in one write. Appending costs the same whatever
   * the file's size; reading it back and rewriting it did not.
   */
  private writePending(): void {
    if (this.writeQueue.length === 0) return
    const entries = this.writeQueue
    this.writeQueue = []

    const logLines =
      entries
        .map(e => {
          const dataStr = e.data ? ` | ${this.stringify(e.data)}` : ''
          return `[${e.timestamp}] [${e.level.toUpperCase()}] [${e.tag}] ${e.message}${dataStr}`
        })
        .join('\n') + '\n'

    try {
      this.rotateIfNeeded()

      const currentLogFile = getCurrentLogFile()
      if (!currentLogFile) return
      if (!currentLogFile.exists) currentLogFile.create()
      currentLogFile.write(logLines, { append: true })
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to write logs:', error)
    }
  }

  private flushWriteQueue(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer)
    this.writeTimer = null
    this.writePending()
  }

  private rotateIfNeeded(): void {
    try {
      const currentLogFile = getCurrentLogFile()
      const logDirectory = getLogDirectory()
      if (!currentLogFile || !logDirectory || !currentLogFile.exists) return

      const fileSizeMB = currentLogFile.size / 1024 / 1024

      if (fileSizeMB > this.config.maxFileSizeMB) {
        // Rotate: rename current to timestamped file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const archiveFile = new File(logDirectory, `logs-${timestamp}.log`)
        currentLogFile.moveSync(archiveFile)
      }
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to rotate log file:', error)
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      const logDirectory = getLogDirectory()
      if (!logDirectory) {
        return
      }

      const contents = logDirectory.list()
      const cutoffDate =
        Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000

      for (const item of contents) {
        if (item instanceof File && item.name !== 'current.log') {
          const modTime = item.modificationTime
          if (modTime !== null && modTime < cutoffDate) {
            item.delete()
          }
        }
      }
    } catch (error) {
      this.originalConsole.error('[Logger] Failed to cleanup old logs:', error)
    }
  }

  private installGlobalErrorHandler(): void {
    const originalHandler = ErrorUtils.getGlobalHandler()

    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.error('CRASH', isFatal ? 'FATAL ERROR' : 'Uncaught Error', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        isFatal,
      })

      // Ensure logs are written before crash
      this.flushWriteQueue()
      if (originalHandler) {
        originalHandler(error, isFatal)
      }
    })

    // Also capture unhandled promise rejections
    const originalRejectionHandler = (global as any).onunhandledrejection
    ;(global as any).onunhandledrejection = (event: { reason: unknown }) => {
      const error =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason))

      this.error('CRASH', 'Unhandled Promise Rejection', {
        name: error.name,
        message: error.message,
        stack: error.stack,
      })

      if (originalRejectionHandler) {
        originalRejectionHandler(event)
      }
    }
  }
}

// Global singleton instance
export const logger = new Logger()
