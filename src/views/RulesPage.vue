<template>
  <div class="relative size-full overflow-x-hidden">
    <template v-if="!isVirtualScroller">
      <RulesCtrl />
      <div
        class="p-3"
        :style="padding"
      >
        <template v-if="rulesTabShow === RULE_TAB_TYPE.PROVIDER">
          <div
            v-if="renderRulesProvider.length === 0"
            class="base-container glass"
          >
            <EmptyState
              :icon="SwatchIcon"
              :title="$t('noRules')"
              :description="$t('noRulesDesc')"
            />
          </div>
          <div
            v-else
            class="base-container glass"
          >
            <RuleProvider
              v-for="(ruleProvider, index) in renderRulesProvider"
              :key="ruleProvider.name"
              :ruleProvider="ruleProvider"
              :index="index + 1"
            />
          </div>
        </template>
        <template v-else>
          <div
            v-if="renderRules.length === 0"
            class="base-container glass"
          >
            <EmptyState
              :icon="SwatchIcon"
              :title="$t('noRules')"
              :description="$t('noRulesDesc')"
            />
          </div>
          <div
            v-else
            class="base-container glass"
          >
            <RuleCard
              v-for="(rule, index) in renderRules"
              :key="rule.payload"
              :rule="rule"
              :index="index + 1"
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
      <template v-slot="{ item: rule, index }: { item: Rule; index: number }">
        <RuleCard
          :key="rule.payload"
          :rule="rule"
          :index="index + 1"
        />
      </template>
    </VirtualScroller>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/common/EmptyState.vue'
import VirtualScroller from '@/components/common/VirtualScroller.vue'
import RulesCtrl from '@/components/controls/RulesCtrl'
import RuleCard from '@/components/rules/RuleCard.vue'
import RuleProvider from '@/components/rules/RuleProvider.vue'
import { usePaddingForViews } from '@/composables/paddingViews'
import { RULE_TAB_TYPE } from '@/constant'
import { SwatchIcon } from '@heroicons/vue/24/outline'
import { fetchRules, renderRules, renderRulesProvider, rulesTabShow } from '@/store/rules'
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
</script>
