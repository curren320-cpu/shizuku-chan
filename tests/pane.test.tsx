import { expect, test } from 'claude-code/testing'

const PANE = {
  plugin: 'shizuku-status', component: 'Pane', requestId: 'shizuku',
  props: { title: 'しずくちゃん', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 30 }, view: {} },
} as const

test('ツール呼び出しで表示が変わる', async ($, on) => {
  on('command.register', () => ({ value: { command: 'shizuku' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await $.tool.call({ tool: 'Read', file_path: '/x/koke_v2_7t.ino' })
  for (const surface of ['terminal', 'desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    expect((await ui.find({ type: 'Text', text: /よみよみ中：koke_v2_7t.ino/ }))?.text).toBe('・よみよみ中：koke_v2_7t.ino')
    await ui.unmount()
  }
})
