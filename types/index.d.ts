export type Mode =
  | 'idle' | 'think' | 'read' | 'search' | 'code' | 'run'
  | 'browse' | 'agent' | 'publish' | 'ask' | 'work' | 'done' | 'oops'
export type Status = { mode: Mode; detail: string }
export type LogLine = { id: string; text: string }

declare module 'claude-code' {
  interface PluginState {
    'shizuku-status': { status: Shaped<Status>; log: Shaped<LogLine[]> }
  }
}
