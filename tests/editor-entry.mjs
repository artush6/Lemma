// Run against the configured dev server: node tests/editor-entry.mjs
// All Supabase traffic is mocked; this never reads or writes real account data.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const env = fs.readFileSync('.env.local', 'utf8');
const cloudUrl = env.match(/^NEXT_PUBLIC_SUPABASE_URL=["']?([^\s"']+)/m)?.[1];
assert(cloudUrl, 'Start the dev server with NEXT_PUBLIC_SUPABASE_URL configured');
const storageKey = `sb-${new URL(cloudUrl).hostname.split('.')[0]}-auth-token`;
const owner = '00000000-0000-4000-8000-000000000001';
const now = new Date().toISOString();
const user = { id: owner, aud: 'authenticated', role: 'authenticated', email: 'qa@example.test', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: now };
const payload = { sub: owner, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600 };
const token = [{ alg: 'HS256', typ: 'JWT' }, payload].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.qa';
const session = { access_token: token, refresh_token: 'qa-refresh', expires_at: payload.exp, expires_in: 3600, token_type: 'bearer', user };
const sample = JSON.parse(fs.readFileSync(new URL('fixtures/graph-content.json', import.meta.url), 'utf8'));
const note = { id: '00000000-0000-4000-8000-000000000002', title: 'Startup regression', content: sample, is_favorite: false, folder_id: null, document_label: 'LECTURE NOTES', page_layout: 'vertical', created_at: now, updated_at: now };

(async () => {
    const browser = await chromium.launch({ channel: process.env.CHROME_CHANNEL || 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        page.setDefaultTimeout(5000);
        const errors = [];
        let listRequests = 0;
        page.on('pageerror', error => errors.push(error.message));
        await page.route(`${new URL(cloudUrl).origin}/**`, route => {
            const path = new URL(route.request().url()).pathname;
            let json = [];
            if (path.includes('/auth/v1/user')) json = user;
            if (path === '/rest/v1/notes' && route.request().method() === 'GET') { listRequests++; json = [note]; }
            return route.fulfill({ status: 200, json });
        });
        await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), { key: storageKey, session });
        await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3000');
        await page.getByRole('heading', { name: 'Your study space' }).waitFor();
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Performance.enable');
        const measurements = [];
        const takeMeasurement = async label => {
            await cdp.send('HeapProfiler.collectGarbage');
            const stats = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
            measurements.push(stats);
            console.log(label, { heapMB: stats.JSHeapUsedSize / 1024 / 1024, nodes: stats.Nodes, taskSeconds: stats.TaskDuration });
        };
        await takeMeasurement('library');
        await page.locator('.library-note').filter({ hasText: note.title }).click();
        await page.waitForTimeout(2000);
        await takeMeasurement('first note');
        await page.locator('.brand-button').click();
        await page.locator('.sidebar .new-note').click();
        await page.waitForTimeout(5000);
        await takeMeasurement('new blank note');
        for (let i = 0; i < 10; i++) {
            await page.locator('.sidebar .new-note').click();
            await page.waitForTimeout(100);
        }
        await page.waitForTimeout(5000);
        await takeMeasurement('after ten new notes');
        await page.locator('.ProseMirror').click();
        await page.keyboard.type('Still responsive');
        assert((await page.locator('.ProseMirror').innerText()).includes('Still responsive'), 'New notes remain editable');
        assert.equal(listRequests, 1, 'Opening and creating notes must not restart workspace loading');
        assert.deepEqual(errors, [], 'No browser runtime errors');
        assert(measurements.at(-1).JSHeapUsedSize < measurements[0].JSHeapUsedSize + 12 * 1024 * 1024, 'Editor entry and note creation must keep retained memory bounded');
        assert(measurements.at(-1).Nodes < measurements[0].Nodes + 1000, 'Creating notes must not retain old editor DOM');
        console.log('PASS: first-note opening, blank-note creation, repeated creation, editing and bounded retained memory');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
