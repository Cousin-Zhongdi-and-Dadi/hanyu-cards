import { existsSync, readFileSync } from 'node:fs'
import process from 'node:process'

const configPath = '.env.mobile.local'
const target = process.argv.includes('--android-release') ? 'Android' : 'iOS'

function fail(message) {
    console.error(`Mobile release check failed: ${message}`)
    process.exitCode = 1
}

if (!existsSync(configPath)) {
    fail(`create ${configPath} from .env.mobile.example and set the deployed HTTPS assistant URL.`)
}
else {
    const contents = readFileSync(configPath, 'utf8')
    const match = contents.match(/^VITE_ASSISTANT_API_URL\s*=\s*([^#\r\n]+)$/m)
    const value = match?.[1]?.trim().replace(/^['"]|['"]$/g, '') ?? ''

    if (/AGICTO_API_KEY\s*=/.test(contents))
        fail(`${configPath} must never contain AGICTO_API_KEY.`)
    if (!value.startsWith('https://'))
        fail('VITE_ASSISTANT_API_URL must use HTTPS.')
    if (/localhost|127\.0\.0\.1|example\.com/i.test(value))
        fail('VITE_ASSISTANT_API_URL must use the deployed server, not a placeholder or local address.')
}

if (target === 'Android') {
    const signingVariables = [
        'HANYU_UPLOAD_STORE_FILE',
        'HANYU_UPLOAD_STORE_PASSWORD',
        'HANYU_UPLOAD_KEY_ALIAS',
        'HANYU_UPLOAD_KEY_PASSWORD',
    ]
    const missing = signingVariables.filter((key) => !process.env[key])
    if (missing.length)
        fail(`set the Android signing variables: ${missing.join(', ')}.`)
}

if (!process.exitCode)
    console.log(`${target} release configuration is ready.`)
