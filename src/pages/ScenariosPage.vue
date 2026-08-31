<script setup lang="ts">
import {
    CheckmarkCircleOutline,
    FlagOutline,
    SparklesOutline,
    VolumeHighOutline,
} from '@vicons/ionicons5'
import {
    computed,
    onMounted,
    ref,
    watch,
} from 'vue'
import type { ScenarioEvaluation } from '@/types/learning'
import { useAssistantStore } from '@/stores/assistant'
import { useContentStore } from '@/stores/content'
import { useProgressStore } from '@/stores/progress'
import { speakMandarin } from '@/utils/learning'
import { evaluateScenarioLocally } from '@/utils/scenarioEvaluation'

const assistant = useAssistantStore()
const content = useContentStore()
const progress = useProgressStore()
const response = ref('')
const submitted = ref(false)
const checking = ref(false)
const evaluation = ref<ScenarioEvaluation>()

const activeScenario = computed(() => content.activeScenario)
const completedCount = computed(() => content.scenarios.filter((scenario) => progress.completedScenarioIds.includes(scenario.id)).length)
const attemptedCount = computed(() => {
    return content.scenarios.filter((scenario) => {
        return Boolean(progress.scenarioProgress[scenario.id]) || progress.completedScenarioIds.includes(scenario.id)
    }).length
})
const completionPercent = computed(() => Math.round((completedCount.value / content.scenarios.length) * 100))
const exploredPercent = computed(() => Math.round((attemptedCount.value / content.scenarios.length) * 100))
const activeProgress = computed(() => activeScenario.value ? progress.scenarioProgress[activeScenario.value.id] : undefined)
const dimensionLabels: Array<{ key: keyof ScenarioEvaluation['dimensions'], label: string }> = [
    { key: 'completeness', label: 'Task coverage' },
    { key: 'naturalness', label: 'Natural phrasing' },
    { key: 'accuracy', label: 'Language accuracy' },
]
const activeScenarioNumber = computed(() => {
    return content.scenarios.findIndex((scenario) => scenario.id === activeScenario.value?.id) + 1
})
const evaluationSourceLabel = computed(() => {
    if (evaluation.value?.source === 'agicto')
        return 'Agicto semantic review'
    if (evaluation.value?.source === 'mock')
        return 'Demo phrase review'

    return 'Offline phrase fallback'
})

watch(() => activeScenario.value?.id, () => {
    response.value = ''
    submitted.value = false
    checking.value = false
    evaluation.value = undefined
})

onMounted(() => {
    void assistant.warmUp()
})

function chooseScenario(scenarioId: string) {
    content.setActiveScenario(scenarioId)
    document.querySelector('.scenario-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function submitTask() {
    if (checking.value || !response.value.trim() || !activeScenario.value)
        return

    const scenario = activeScenario.value
    const learnerResponse = response.value.trim()
    checking.value = true
    submitted.value = false
    evaluation.value = evaluateScenarioLocally(scenario, learnerResponse)
    const finalEvaluation = await assistant.evaluateScenario(scenario, learnerResponse)
    if (activeScenario.value?.id !== scenario.id)
        return

    evaluation.value = finalEvaluation
    submitted.value = true
    checking.value = false
    await progress.recordScenarioAttempt(scenario.id, finalEvaluation)
}

function resetEvaluation() {
    submitted.value = false
    evaluation.value = undefined
}

function openTutor() {
    assistant.open()
}
</script>

<template>
    <section class="screen scenarios-screen">
        <section class="missions-hero">
            <div>
                <p class="eyebrow">Real-life missions · Learn it where you’ll use it</p>
                <h2>Six missions.<br />Real-life Mandarin.</h2>
                <p>Move from useful words to a complete conversation, then make the language your own.</p>
            </div>
            <div
                class="scenario-summary"
                aria-label="Scenario course progress">
                <div>
                    <FlagOutline></FlagOutline>
                    <span><strong>{{ completedCount }}/{{ content.scenarios.length }}</strong><small>missions complete</small></span>
                </div>
                <div class="progress-track"><i :style="{ width: `${completionPercent}%` }"></i></div>
            </div>
        </section>

        <div class="scenario-workspace">
            <aside
                class="scenario-list"
                aria-label="Scenario missions">
                <header>
                    <p class="eyebrow">Your route</p>
                    <span>{{ exploredPercent }}% explored</span>
                </header>
                <button
                    v-for="(scenario, index) in content.scenarios"
                    :key="scenario.id"
                    @click="chooseScenario(scenario.id)"
                    type="button"
                    class="scenario-tab"
                    :class="{
                        active: activeScenario?.id === scenario.id,
                        complete: progress.completedScenarioIds.includes(scenario.id),
                        attempted: progress.scenarioProgress[scenario.id]
                            && !progress.completedScenarioIds.includes(scenario.id),
                    }"
                    :aria-current="activeScenario?.id === scenario.id ? 'step' : undefined">
                    <span class="scenario-tab__index">{{ String(index + 1).padStart(2, '0') }}</span>
                    <span>
                        <strong>{{ scenario.title }}</strong>
                        <small>
                            HSK {{ scenario.level }} · {{ scenario.durationMinutes }} min
                            <template v-if="progress.scenarioProgress[scenario.id]"> · Best {{ progress.scenarioProgress[scenario.id].bestScore }}</template>
                        </small>
                    </span>
                    <CheckmarkCircleOutline
                        v-if="progress.completedScenarioIds.includes(scenario.id)"
                        class="scenario-tab__complete"
                        aria-label="Complete">
                    </CheckmarkCircleOutline>
                </button>
            </aside>

            <article
                v-if="activeScenario"
                class="scenario-detail">
                <header class="scenario-hero">
                    <div>
                        <p class="eyebrow">Mission {{ String(activeScenarioNumber).padStart(2, '0') }} · HSK {{ activeScenario.level }}</p>
                        <h3>{{ activeScenario.chineseTitle }}</h3>
                        <span>{{ activeScenario.title }}</span>
                    </div>
                    <button
                        @click="openTutor"
                        type="button"
                        class="secondary-action">
                        <SparklesOutline></SparklesOutline>
                        AI role-play
                    </button>
                    <p>{{ activeScenario.mission }}</p>
                    <footer>
                        <span>{{ activeScenario.durationMinutes }} min</span>
                        <span>{{ activeScenario.setting }}</span>
                        <span v-if="activeProgress">Best {{ activeProgress.bestScore }}/100 · {{ activeProgress.attempts }} attempt{{ activeProgress.attempts === 1 ? '' : 's' }}</span>
                    </footer>
                    <i
                        class="scenario-hero__seal"
                        aria-hidden="true">用中文</i>
                </header>

                <section class="lesson-section mission-objectives">
                    <div class="lesson-heading">
                        <span>01</span>
                        <div>
                            <p class="eyebrow">Mission skills</p>
                            <h3>What you will do</h3>
                        </div>
                    </div>
                    <ul>
                        <li
                            v-for="objective in activeScenario.objectives"
                            :key="objective">
                            {{ objective }}
                        </li>
                    </ul>
                </section>

                <section class="lesson-section">
                    <div class="lesson-heading">
                        <span>02</span>
                        <div>
                            <p class="eyebrow">Core expressions</p>
                            <h3>Build your toolkit</h3>
                        </div>
                    </div>
                    <div class="scenario-vocabulary">
                        <article
                            v-for="word in activeScenario.vocabulary"
                            :key="word.simplified">
                            <header>
                                <strong>{{ word.simplified }}</strong>
                                <button
                                    @click="speakMandarin(word.simplified)"
                                    type="button"
                                    :aria-label="`Play ${word.simplified}`">
                                    <VolumeHighOutline></VolumeHighOutline>
                                </button>
                            </header>
                            <span>{{ word.pinyin }} · {{ word.english }}</span>
                            <p>{{ word.usage }}</p>
                        </article>
                    </div>
                </section>

                <section class="lesson-section">
                    <div class="lesson-heading">
                        <span>03</span>
                        <div>
                            <p class="eyebrow">Model dialogue</p>
                            <h3>Hear it in context</h3>
                        </div>
                    </div>
                    <div class="scenario-dialogue">
                        <div
                            v-for="(line, index) in activeScenario.dialogue"
                            :key="`${line.speaker}-${index}`"
                            class="dialogue-line">
                            <span>{{ line.speaker }}</span>
                            <div>
                                <strong>{{ line.zh }}</strong>
                                <small>{{ line.pinyin }}</small>
                                <p>{{ line.en }}</p>
                            </div>
                            <button
                                @click="speakMandarin(line.zh)"
                                type="button"
                                :aria-label="`Play line ${index + 1}`">
                                <VolumeHighOutline></VolumeHighOutline>
                            </button>
                        </div>
                    </div>
                </section>

                <aside class="culture-band">
                    <span>Culture in context</span>
                    <div>
                        <h3>{{ activeScenario.cultureTitle }}</h3>
                        <p>{{ activeScenario.cultureNote }}</p>
                    </div>
                </aside>

                <section class="scenario-task">
                    <div class="lesson-heading">
                        <span>04</span>
                        <div>
                            <p class="eyebrow">Your turn</p>
                            <h3>Complete the mission</h3>
                        </div>
                    </div>
                    <p>{{ activeScenario.task.prompt }}</p>
                    <label :for="`scenario-response-${activeScenario.id}`">Your response in Chinese</label>
                    <textarea
                        :id="`scenario-response-${activeScenario.id}`"
                        v-model="response"
                        @input="resetEvaluation"
                        rows="4"
                        :disabled="checking"
                        :placeholder="activeScenario.task.hint">
                    </textarea>
                    <p class="scenario-task__check-note">
                        <SparklesOutline></SparklesOutline>
                        One submission marks this mission explored. Completion requires all essential ideas and a semantic score of 70 or higher.
                    </p>
                    <button
                        @click="submitTask"
                        class="primary-action"
                        type="button"
                        :disabled="!response.trim() || checking">
                        <SparklesOutline></SparklesOutline>
                        {{ checking ? 'Checking meaning…' : 'Check response' }}
                    </button>

                    <div
                        v-if="checking && evaluation"
                        class="task-feedback task-feedback--checking"
                        aria-live="polite">
                        <div class="task-feedback__summary">
                            <strong>Quick check ready</strong>
                            <span>{{ evaluation.score }}/100</span>
                        </div>
                        <small>Waiting for Agicto to verify the meaning. The final semantic result will replace this local preview.</small>
                    </div>

                    <div
                        v-if="submitted && evaluation"
                        class="task-feedback"
                        :class="{ 'task-feedback--complete': evaluation.passed }"
                        aria-live="polite">
                        <div class="task-feedback__summary">
                            <div>
                                <strong>{{ evaluation.passed
                                    ? 'Mission complete'
                                    : evaluation.score < 70
                                        ? `Needs revision · ${70 - evaluation.score} points to 70`
                                        : 'Needs revision · add every essential idea' }}</strong>
                                <p>{{ evaluation.feedback }}</p>
                            </div>
                            <span>{{ evaluation.score }}/100</span>
                        </div>
                        <small class="task-feedback__source">{{ evaluationSourceLabel }}</small>
                        <div
                            class="evaluation-dimensions"
                            aria-label="AI score dimensions">
                            <div
                                v-for="dimension in dimensionLabels"
                                :key="dimension.key">
                                <header><span>{{ dimension.label }}</span><strong>{{ evaluation.dimensions[dimension.key] }}</strong></header>
                                <div class="progress-track"><i :style="{ width: `${evaluation.dimensions[dimension.key]}%` }"></i></div>
                            </div>
                        </div>
                        <div
                            v-if="evaluation.strengths.length || evaluation.improvements.length"
                            class="task-feedback__details">
                            <div v-if="evaluation.strengths.length">
                                <p>What worked</p>
                                <ul>
                                    <li
                                        v-for="strength in evaluation.strengths"
                                        :key="strength">{{ strength }}</li>
                                </ul>
                            </div>
                            <div v-if="evaluation.improvements.length">
                                <p>Try next</p>
                                <ul>
                                    <li
                                        v-for="improvement in evaluation.improvements"
                                        :key="improvement">{{ improvement }}</li>
                                </ul>
                            </div>
                        </div>
                        <p>Model response</p>
                        <span>{{ activeScenario.task.modelAnswer.zh }}</span>
                        <small>{{ activeScenario.task.modelAnswer.pinyin }}</small>
                        <small>{{ activeScenario.task.modelAnswer.en }}</small>
                        <aside
                            v-if="evaluation.followUp"
                            class="evaluation-follow-up">
                            <SparklesOutline></SparklesOutline>
                            <div>
                                <p>Follow-up challenge</p>
                                <span>{{ evaluation.followUp }}</span>
                            </div>
                        </aside>
                    </div>
                </section>
            </article>
        </div>
    </section>
</template>
