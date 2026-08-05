import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  // 视图层不得自行判断后端类型,也不得直接调 api 层。
  // 后端差异一律收敛在 assembly:能力用 can() 读,请求走对应域的门面。
  // 背景见 src/assembly/backend.ts 顶部注释。
  {
    name: 'app/view-layer-boundaries',
    files: ['src/components/**', 'src/views/**', 'src/composables/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/assembly/backend',
              importNames: ['channel', 'core', 'apiVersion', 'resetCore'],
              message: '视图层只能通过 can() 读能力,不要直接判断通道 / 内核。',
            },
            {
              name: '@/api',
              message: '视图层不要直接调后端 api,请走 assembly 对应域的门面。',
            },
          ],
          patterns: [
            {
              // 只挡后端方言模块;api/geoip、api/latency 是与后端无关的外部服务调用,不受限。
              group: ['@/api/clash', '@/api/singbox', '@/api/singbox/**'],
              message: '视图层不要直接调后端 api,请走 assembly 对应域的门面。',
            },
          ],
        },
      ],
    },
  },

  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig({
    rules: {
      'vue/singleline-html-element-content-newline': 'off',
      'vue/multiline-html-element-content-newline': 'off',
      'vue/max-attributes-per-line': [
        'error',
        {
          singleline: 1,
          multiline: 1,
        },
      ],
    },
  }),
  skipFormatting,
]
