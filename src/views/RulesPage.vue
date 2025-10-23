<template>
  <div
    class="flex flex-col gap-1 overflow-x-hidden"
    :class="renderRules.length < 200 && 'p-2'"
  >
    <template v-if="rulesTabShow === RULE_TAB_TYPE.PROVIDER">
      <RuleProvider
        v-for="(ruleProvider, index) in renderRulesProvider"
        :key="ruleProvider.name"
        :rule-provider="ruleProvider"
        :index="index + 1"
      />
    </template>
    <template v-else-if="renderRules.length < 200">
      <RuleCard
        v-for="rule in renderRules"
        :key="rule.payload"
        :rule="rule"
        :index="rules.indexOf(rule) + 1"
      />
    </template>
    <VirtualScroller
      v-else
      :data="renderRules"
      :size="64"
    >
      <template #default="{ item: rule }: { item: Rule }">
        <RuleCard
          :key="rule.payload"
          class="mb-1"
          :rule="rule"
          :index="rules.indexOf(rule) + 1"
        />
      </template>
    </VirtualScroller>
  </div>
</template>

<script setup lang="ts">
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import RuleCard from '@/components/rules/RuleCard.vue'
import RuleProvider from '@/components/rules/RuleProvider.vue'
import { RULE_TAB_TYPE } from '@/constant'
import { fetchRules, renderRules, renderRulesProvider, rules, rulesTabShow } from '@/store/rules'
import type { Rule } from '@/types'

fetchRules()
</script>
