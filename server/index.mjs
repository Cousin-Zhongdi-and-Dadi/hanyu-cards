import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import OpenAI from 'openai'

const app = express()
const port = Number(process.env.PORT ?? 8787)
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:5173,capacitor://localhost,ionic://localhost')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin))
            callback(null, true)
        else
            callback(new Error(`Origin ${origin} is not allowed`))
    },
}))
app.use(express.json({ limit: '48kb' }))

const requestBuckets = new Map()

function rateLimit(req, res, next) {
    const key = req.ip ?? 'unknown'
    const now = Date.now()
    const bucket = requestBuckets.get(key) ?? { count: 0, resetAt: now + 60_000 }

    if (bucket.resetAt < now) {
        bucket.count = 0
        bucket.resetAt = now + 60_000
    }

    bucket.count += 1
    requestBuckets.set(key, bucket)

    if (bucket.count > Number(process.env.ASSISTANT_RATE_LIMIT_PER_MINUTE ?? 20))
        return res.status(429).json({ error: 'Too many assistant requests. Try again in a minute.' })

    next()
}

function localTutorReply({ message, context }) {
    const word = context?.activeWord
    const scenario = context?.activeScenario
    if (scenario && message.toLocaleLowerCase().includes('role-play')) {
        const firstLine = scenario.dialogue?.[0]

        return [
            `Let us practice “${scenario.title}”. I will play the other speaker.`,
            firstLine ? `${firstLine.speaker}: ${firstLine.zh}\n${firstLine.pinyin}` : `Mission: ${scenario.mission}`,
            'Reply in Chinese. I will keep the exchange short and correct one important issue at a time.',
        ].join('\n\n')
    }
    if (!word)
        return 'Pick a word or mission, then ask me for a pronunciation tip, mnemonic, review plan, or role-play.'

    const mistakeCount = context?.recentMistakes?.length ?? 0

    return [
        `${word.simplified} (${word.pinyin}) means "${word.english}".`,
        `For recall, say the word aloud, cover the English meaning, then make one sentence using ${word.simplified}.`,
        mistakeCount
            ? `You also have ${mistakeCount} recent mistake${mistakeCount === 1 ? '' : 's'}; review them before adding new cards.`
            : 'No recent mistakes are in the assistant context yet.',
        `Your request was: "${message}". Connect OPENAI_API_KEY for full AI tutoring.`,
    ].join('\n\n')
}

app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'hanyu-assistant' })
})

app.post('/api/assistant/chat', rateLimit, async (req, res) => {
    const { message, context, history } = req.body ?? {}

    if (typeof message !== 'string' || !message.trim())
        return res.status(400).json({ error: 'message is required' })

    if (!process.env.OPENAI_API_KEY || process.env.AI_MOCK === 'true')
        return res.json({ reply: localTutorReply({ message, context }) })

    try {
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
        const activeWord = context?.activeWord
        const activeScenario = context?.activeScenario
        const recentMistakes = Array.isArray(context?.recentMistakes)
            ? context.recentMistakes.map((word) => `${word.simplified} (${word.pinyin})`).join(', ')
            : 'none'

        const response = await client.responses.create({
            model: process.env.AI_MODEL ?? 'gpt-5.4-mini',
            max_output_tokens: 700,
            instructions: [
                'You are a concise Mandarin Chinese tutor for adult foreign learners.',
                'Explain in clear English, include Chinese characters and pinyin when useful, and keep answers under 180 words.',
                'Use the active HSK word context when provided. Do not invent user progress data.',
                'Adapt vocabulary and sentence length to the learner HSK level. For role-play, stay in the active scenario, send one turn at a time, and wait for the learner.',
                'Correct at most one important issue per role-play turn, then give a natural example.',
                'If asked for a quiz, provide one small exercise and the answer separately.',
            ].join(' '),
            input: [
                {
                    role: 'user',
                    content: JSON.stringify({
                        userMessage: message,
                        activeWord,
                        activeScenario: activeScenario ? {
                            title: activeScenario.title,
                            chineseTitle: activeScenario.chineseTitle,
                            mission: activeScenario.mission,
                            dialogue: activeScenario.dialogue,
                            targetExpressions: activeScenario.task?.expectedKeywords,
                        } : undefined,
                        learnerLevel: context?.learnerLevel,
                        dueCount: context?.dueCount,
                        masteredCount: context?.masteredCount,
                        recentMistakes,
                        recentHistory: Array.isArray(history) ? history.slice(-6) : [],
                    }),
                },
            ],
        })

        res.json({ reply: response.output_text })
    }
    catch (error) {
        console.error(error)
        res.status(502).json({ error: 'Assistant provider failed', reply: localTutorReply({ message, context }) })
    }
})

app.listen(port, () => {
    console.log(`HanYu assistant API listening on http://localhost:${port}`)
})
