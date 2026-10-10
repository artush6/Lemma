// Run against the configured dev server: node tests/auth-startup.mjs
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
const note = { id: '00000000-0000-4000-8000-000000000002', title: 'Startup regression', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Editable content' }] }] }, is_favorite: false, folder_id: null, document_label: 'LECTURE NOTES', page_layout: 'vertical', created_at: now, updated_at: now };

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
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('dialog', { name: 'Writing settings' }).waitFor();
        await page.getByRole('button', { name: 'Close writing settings' }).click();
        await page.waitForTimeout(2000);
        assert.equal(listRequests, 1, 'Startup loads the workspace exactly once');
        await page.reload();
        await page.getByRole('heading', { name: 'Your study space' }).waitFor();
        await page.waitForTimeout(1000);
        assert.equal(listRequests, 2, 'Reload loads once without restarting auth');
        await page.locator('.library-note').filter({ hasText: note.title }).click();
        const editor = page.locator('.ProseMirror');
        await editor.click();
        await page.keyboard.press('End');
        await page.keyboard.type(' remains responsive');
        await page.evaluate(({ key, session }) => {
            const channel = new BroadcastChannel(key);
            channel.postMessage({ event: 'TOKEN_REFRESHED', session });
            channel.close();
        }, { key: storageKey, session });
        await page.waitForTimeout(1200);
        assert.equal(listRequests, 2, 'Token refresh does not reload or replace edits');
        assert((await editor.innerText()).includes('remains responsive'));
        await page.getByRole('button', { name: 'Settings', exact: true }).click();
        await page.getByRole('button', { name: 'Sign out', exact: true }).click();
        await page.getByRole('button', { name: 'Continue as guest', exact: true }).waitFor();
        await page.evaluate(({ key, session }) => {
            const channel = new BroadcastChannel(key);
            channel.postMessage({ event: 'SIGNED_IN', session });
            channel.close();
        }, { key: storageKey, session });
        await page.locator('.ProseMirror').waitFor();
        await page.waitForTimeout(1000);
        assert.equal(listRequests, 3, 'Signing in again loads once');
        assert.deepEqual(errors, [], 'No browser runtime errors');
        console.log('PASS: signed-in startup, reload, controls, editing, token refresh, sign-out and sign-in');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
