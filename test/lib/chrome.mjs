// 启动一次性的 headless Chrome:用临时 user-data-dir,跑完就删,不碰用户自己的浏览器配置。
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { sleep } from './cdp.mjs'

const CANDIDATES = [
  process.env.CHROME_BIN,
  'google-chrome-stable',
  'google-chrome',
  'chromium',
  'chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].filter(Boolean)

const resolveChrome = () => {
  for (const candidate of CANDIDATES) {
    // 带路径的候选要求文件真的在;裸命令名交给 PATH 解析,启动失败时再报错
    if (!candidate.includes('/') && !candidate.includes('\\')) return candidate
    if (existsSync(candidate)) return candidate
  }

  throw new Error(
    `没找到 Chrome。装一个 Chrome / Chromium,或用 CHROME_BIN 指定可执行文件路径。已尝试:\n  ${CANDIDATES.join('\n  ')}`,
  )
}

export const launchChrome = async ({ port = 9222, headless = true, args = [] } = {}) => {
  const binary = resolveChrome()
  const userDataDir = await mkdtemp(join(tmpdir(), 'zashboard-perf-'))
  const child = spawn(
    binary,
    [
      headless ? '--headless=new' : '',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${userDataDir}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      // 后台标签页会被降频,基准数据会失真
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      ...args,
      'about:blank',
    ].filter(Boolean),
    { stdio: 'ignore' },
  )

  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`http://127.0.0.1:${port}/json/version`)
      return {
        async close() {
          // 等进程真的退出再删 user-data-dir,否则 Chrome 还在写文件,rmdir 会 ENOTEMPTY;
          // 但进程可能已经自己没了,所以既要判断 exitCode,也要留个超时兜底,不能干等。
          if (child.exitCode === null) {
            const exited = new Promise((resolve) => child.once('exit', resolve))

            child.kill()
            await Promise.race([exited, sleep(3000)])
          }

          await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
        },
      }
    } catch {
      await sleep(100)
    }
  }

  child.kill()
  await rm(userDataDir, { recursive: true, force: true })
  throw new Error(`Chrome 起来了但 ${port} 端口的调试接口没响应`)
}
