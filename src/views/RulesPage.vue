<template>
  <div class="relative size-full overflow-x-hidden">
    <template v-if="!isVirtualScroller">
      <RulesCtrl />
      <div
        class="p-3"
        :style="padding"
      >
        <template v-if="rulesTabShow === RULE_TAB_TYPE.PROVIDER">
          <div class="base-container">
            <RuleProvider
              v-for="(ruleProvider, index) in renderRulesProvider"
              :key="ruleProvider.name"
              :ruleProvider="ruleProvider"
              :index="index + 1"
            />
          </div>
        </template>
        <template v-else>
          <div class="base-container">
            <RuleCard
              v-for="rule in renderRules"
              :key="rule.payload"
              :rule="rule"
              :index="ruleIndexMap.get(rule) ?? 0"
            />
          </div>
        </template>
      </div>
    </template>
    <VirtualScroller
      v-else
      :data="renderRules"
      :size="44"
    >
      <template v-slot:before>
        <RulesCtrl />
      </template>
      <template v-slot="{ item: rule }: { item: Rule }">
        <RuleCard
          :key="rule.payload"
          :rule="rule"
          :index="ruleIndexMap.get(rule) ?? 0"
        />
      </template>
    </VirtualScroller>
  </div>
</template>

<script setup lang="ts">
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import RulesCtrl from '@/components/controls/RulesCtrl'
import RuleCard from '@/components/rules/RuleCard.vue'
import RuleProvider from '@/components/rules/RuleProvider.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { RULE_TAB_TYPE } from '@/constant'
import { fetchRules, renderRules, renderRulesProvider, rules, rulesTabShow } from '@/assembly/rules'
import type { Rule } from '@/types'
import { computed, provide, ref } from 'vue'

fetchRules()

const expandedRule = ref<string | null>(null)
provide('expandedRule', expandedRule)

const { padding } = usePaddingForViews({
  offsetTop: 12,
  offsetBottom: 8,
})
const isVirtualScroller = computed(() => {
  return rulesTabShow.value === RULE_TAB_TYPE.RULES && renderRules.value.length > 200
})

// 行号查表:模板里 rules.indexOf(rule) 是每渲染行对全量规则的 O(N) 身份线性扫,
// 过滤后走非虚拟路径全部挂载时是 200×O(N)
const ruleIndexMap = computed(() => new Map(rules.value.map((rule, index) => [rule, index + 1])))
</script>
