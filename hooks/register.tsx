import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { LogLine, Mode, Status } from '../types'

const PANE = 'shizuku'
const TITLE = 'しずくちゃん'

const status = atom({ plugin: 'shizuku-status', key: 'status' } as const, { mode: 'idle', detail: '' } as Status, {
  shape: 'status-1',
})
const log = atom({ plugin: 'shizuku-status', key: 'log' } as const, [] as LogLine[], { shape: 'log-1' })

/* ---------- 各状態のセリフと見た目 ---------- */
const LOOK: Record<Mode, { say: string; prop: string; anim: string; color: string }> = {
  idle: { say: '待ってるよ〜', prop: '', anim: 'bob', color: '#6cc4ff' },
  think: { say: 'うーん、考え中…', prop: '💭', anim: 'think', color: '#6cc4ff' },
  read: { say: 'よみよみ中📖', prop: '📄', anim: 'think', color: '#6cc4ff' },
  search: { say: '調べものしてるよ🔍', prop: '🔍', anim: 'look', color: '#6cc4ff' },
  code: { say: 'カタカタ…書いてるよ', prop: '⌨️', anim: 'type', color: '#6cc4ff' },
  run: { say: '動かしてみてる！', prop: '🧪', anim: 'type', color: '#6cc4ff' },
  browse: { say: 'ブラウザで見てるよ', prop: '🌐', anim: 'look', color: '#6cc4ff' },
  agent: { say: '仲間にお願い中🤝', prop: '📨', anim: 'bob', color: '#9fb8ff' },
  publish: { say: 'ページを公開中✨', prop: '📤', anim: 'jump', color: '#6cc4ff' },
  ask: { say: 'ちょっと質問があるよ', prop: '❓', anim: 'look', color: '#6cc4ff' },
  work: { say: '作業中だよ', prop: '🔧', anim: 'type', color: '#6cc4ff' },
  done: { say: 'できた！🎉', prop: '✨', anim: 'jump', color: '#6cc4ff' },
  oops: { say: 'あれれ、止まっちゃった', prop: '💦', anim: 'shake', color: '#a9c4d6' },
}

function modeOf(tool: string): Mode {
  const t = tool.toLowerCase()
  if (t.startsWith('task')) return 'work'
  if (t.includes('browser') || t.includes('chrome')) return 'browse'
  if (t === 'read' || t === 'glob' || t === 'grep' || t.includes('memory_read') || t.includes('list_dir') ||
    t.includes('stage_files') || t.includes('get_') || t.includes('list') || t.includes('search_threads')) return 'read'
  if (t === 'websearch' || t === 'webfetch' || t === 'toolsearch' || t.includes('search')) return 'search'
  if (t === 'write' || t === 'edit' || t === 'notebookedit' || t.includes('commit_files') || t.includes('create') ||
    t.includes('update')) return 'code'
  if (t === 'bash' || t.includes('device_bash')) return 'run'
  if (t === 'agent' || t === 'sendmessage') return 'agent'
  if (t === 'artifact') return 'publish'
  if (t === 'askuserquestion') return 'ask'
  if (t.startsWith('task')) return 'work'
  return 'work'
}

function short(s: unknown, n = 36): string {
  if (typeof s !== 'string') return ''
  const one = s.replace(/\s+/g, ' ').trim()
  const base = one.includes('/') && !one.includes(' ') ? one.split('/').pop() ?? one : one
  return base.length > n ? base.slice(0, n) + '…' : base
}

function detailOf(input: Record<string, unknown>): string {
  return short(input.file_path ?? input.path ?? input.query ?? input.url ?? input.command ??
    input.pattern ?? input.description ?? '')
}

/* ---------- アニメーションするSVG ---------- */
function svg(mode: Mode): string {
  const l = LOOK[mode]
  const sparks = mode === 'done'
    ? ['✨', '⭐', '💖', '✨'].map((s, i) =>
      `<text class="sp sp${i}" x="${40 + i * 40}" y="40" font-size="16">${s}</text>`).join('')
    : ''
  const dots = mode === 'think' || mode === 'read'
    ? '<g class="dots"><circle cx="150" cy="38" r="4"/><circle cx="163" cy="30" r="5"/><circle cx="178" cy="20" r="6"/></g>'
    : ''
  const sad = mode === 'oops'
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="200" height="150">
<style>
.ch{transform-origin:100px 140px}
.bob{animation:bob 2s ease-in-out infinite}
.think{animation:think 1.6s ease-in-out infinite}
.look{animation:look 2s ease-in-out infinite}
.type{animation:type .25s linear infinite}
.jump{animation:jump .8s ease-in-out infinite}
.shake{animation:shake .5s ease-in-out infinite}
.eye{animation:blink 4s infinite;transform-box:fill-box;transform-origin:center}
.prop{animation:prop 1.2s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
.dots circle{fill:#cfe9ff;animation:dot 1.5s infinite}
.dots circle:nth-child(2){animation-delay:.2s}.dots circle:nth-child(3){animation-delay:.4s}
.sp{animation:sp 1.2s ease-out infinite}
.sp1{animation-delay:.3s}.sp2{animation-delay:.6s}.sp3{animation-delay:.9s}
@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes think{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
@keyframes look{0%,100%{transform:translateX(0)}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}
@keyframes type{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-3px) rotate(2deg)}}
@keyframes jump{0%,100%{transform:translateY(0) scale(1)}30%{transform:translateY(-22px) scale(1.04,.96)}60%{transform:translateY(0) scale(1.08,.92)}}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes prop{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes dot{0%,100%{opacity:.2}50%{opacity:1}}
@keyframes sp{0%{opacity:0;transform:translateY(20px)}40%{opacity:1}100%{opacity:0;transform:translateY(-10px)}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}
</style>
<defs><radialGradient id="g" cx="35%" cy="40%" r="70%"><stop offset="0" stop-color="#e3f5ff"/><stop offset="1" stop-color="${l.color}"/></radialGradient></defs>
${sparks}${dots}
<g class="ch ${l.anim}">
  <ellipse cx="100" cy="143" rx="30" ry="4" fill="#000" opacity=".08"/>
  <path d="M100 30 C112 52 138 74 138 100 A38 38 0 0 1 62 100 C62 74 88 52 100 30Z" fill="url(#g)"/>
  <ellipse cx="88" cy="70" rx="6" ry="9" fill="#fff" opacity=".7"/>
  <ellipse class="eye" cx="88" cy="102" rx="4.5" ry="${sad ? 2 : 6}" fill="#2b2733"/>
  <ellipse class="eye" cx="112" cy="102" rx="4.5" ry="${sad ? 2 : 6}" fill="#2b2733"/>
  <ellipse cx="78" cy="113" rx="6" ry="3.5" fill="#ff9fbf" opacity=".85"/>
  <ellipse cx="122" cy="113" rx="6" ry="3.5" fill="#ff9fbf" opacity=".85"/>
  <path d="${sad ? 'M94 119 Q100 113 106 119' : mode === 'done' ? 'M92 112 Q100 124 108 112 Z' : 'M94 114 Q100 120 106 114'}"
    fill="${mode === 'done' ? '#ff7a9c' : 'none'}" stroke="#2b2733" stroke-width="2.5" stroke-linecap="round"/>
  ${l.prop ? `<text class="prop" x="140" y="96" font-size="26">${l.prop}</text>` : ''}
</g>
</svg>`
}

/* ---------- 状態の更新 ---------- */
async function setMode($: EngineInterface, mode: Mode, detail = '', logIt = false) {
  await update($, status, () => ({ mode, detail }))
  if (logIt) {
    const text = LOOK[mode].say.replace(/[📖🔍🤝✨🎉]/gu, '').trim() + (detail ? `：${detail}` : '')
    await update($, log, list => [...list, { id: String(Date.now()) + Math.random(), text }].slice(-30))
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'shizuku', description: 'しずくちゃんのパネルを開く' })
    void $.ui.open({ id: PANE, title: TITLE })
    return next(e)
  })

  on('command.run', { command: 'shizuku' }, async $ => {
    await $.ui.open({ id: PANE, title: TITLE })
    return { text: 'しずくちゃんのパネルを開いたよ。' }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      await update($, log, () => [])
      await setMode($, 'think')
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const mode = modeOf(e.tool)
    const detail = detailOf(e as unknown as Record<string, unknown>)
    await setMode($, mode, detail, true)
    try {
      return await next(e)
    } finally {
      await setMode($, 'think')
    }
  }).catch(($, e, next) => (next.called ? next(e) : next(e)))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      await setMode($, e.reason === 'answer' ? 'done' : 'oops')
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const { Box, Text } = ui
    const s = await read($, status)
    const lines = await read($, log)
    const look = LOOK[s.mode] ?? LOOK.idle
    const room = Math.max(3, Math.min(8, (e.viewport?.rows ?? 30) - 14))
    const Svg = 'Svg' in ui ? ui.Svg : undefined

    return (
      <Box flexDirection="column" alignItems="center" gap={1} padding={1}>
        <Text weight="bold" size="heading">{look.say}</Text>
        {Svg
          ? <Svg source={svg(s.mode)} alt={`しずくちゃん：${look.say}`} width={200} height={150} isInteractive />
          : <Text>{`💧 ${look.prop}`}</Text>}
        {s.detail ? <Text dimColor size="footnote">{s.detail}</Text> : null}
        <Box flexDirection="column" width="100%" gap={0}>
          {lines.length > 0 && <Text size="caption" dimColor>さっきまでやったこと</Text>}
          {lines.slice(-room).map(line => (
            <Text key={line.id} size="footnote">・{line.text}</Text>
          ))}
        </Box>
      </Box>
    )
  })
}
