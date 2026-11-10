import { test, expect } from '@playwright/test';
test('mock routes, fallback, privacy, trace and responsive rendering', async ({page}) => {
  const external: string[] = []; page.on('request',r => { if (!r.url().startsWith('http://127.0.0.1:4173')) external.push(r.url()); });
  await page.goto('/'); await page.selectOption('#power','plugged');
  await expect(page.locator('#mode-badge')).toHaveText('MOCK · NO AI RUNNING');
  await page.click('#run'); await expect(page.locator('#traces article').first()).toContainText('MOCK SIMULATED ON_DEVICE');
  await page.uncheck('#device'); await page.click('#run'); await expect(page.locator('#traces article').first()).toContainText('MOCK SIMULATED IN_CLOUD');
  await page.check('#private'); await page.click('#run'); await expect(page.locator('#traces article').first()).toContainText('UNKNOWN · error'); await expect(page.locator('#status')).toContainText('No cloud fallback attempted');
  await page.check('#device'); await page.click('#long-example'); await page.click('#run'); await expect(page.locator('#traces article').first()).toContainText('UNKNOWN · blocked');
  await page.uncheck('#private'); await page.click('#run'); await expect(page.locator('#traces article').first()).toContainText('MOCK SIMULATED IN_CLOUD');
  await page.screenshot({path:'../artifacts/scaffold-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:'../artifacts/scaffold-mobile.png',fullPage:true});
  expect(external).toEqual([]);
});
test('built app reloads offline and mock works without Firebase credentials', async ({page,context}) => {
  await page.goto('/'); await page.evaluate(() => navigator.serviceWorker.ready); await page.reload();
  await context.setOffline(true); await page.reload();
  await expect(page.locator('#mode-badge')).toContainText('MOCK');
  await page.check('#device'); await page.click('#run'); await expect(page.locator('#traces article').first()).toContainText('MOCK SIMULATED ON_DEVICE');
  await expect(page.locator('#route-preview')).toContainText('ONLY_ON_DEVICE');
});
