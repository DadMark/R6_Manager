/**
 * Smoke-play the built game in a real browser.
 *
 * Not part of the test suite — a manual verification harness. It caught the
 * draft shipping four operators per side when a lineup needs five, which no
 * unit test noticed.
 *
 *   npx vite build && npx vite preview --port 4173 &
 *   node play-check.mjs
 */
import { chromium } from 'playwright';

const OUT = process.env.OUT_DIR ?? '.';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
const page = await browser.newPage({ viewport: { width: 1180, height: 940 } });

const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

const heading = () => page.locator('h2').first().innerText();

await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${OUT}/01-home.png` });
console.log('title:', await page.title());

await page.locator('input').first().fill('Fúria');
await page.locator('input').nth(1).fill('copa-2026');
await page.getByRole('button', { name: 'Nova campanha' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/02-draft.png` });

let picks = 0;
while (picks < 30 && (await heading()).startsWith('Escolha um')) {
  await page.locator('button').filter({ hasText: /MIRA/ }).first().click();
  await page.waitForTimeout(110);
  picks++;
}
console.log('draft picks:', picks, '| now:', await heading());
await page.screenshot({ path: `${OUT}/03-bracket.png` });

await page.getByRole('button', { name: /^Jogar / }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/04-setup.png` });
console.log('setup:', await heading());

const playBtn = page.getByRole('button', { name: /Jogar o round|Escolha mais/ });
console.log('play button:', await playBtn.innerText(), '| enabled:', await playBtn.isEnabled());
await playBtn.click();
await page.waitForTimeout(500);

await page.getByRole('button', { name: '4×' }).click();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/05-playback.png` });

await page
  .getByRole('button', { name: 'Pular' })
  .click()
  .catch(() => {});
await page.waitForTimeout(400);
console.log('narration lines:', await page.locator('ol li').count());
await page.screenshot({ path: `${OUT}/05b-playback-full.png` });

await page.getByRole('button', { name: /Ver resultado do round/ }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/06-result.png` });
console.log('result:', await heading());

// Play on until the run ends, to prove the whole loop closes.
let guard = 0;
while (guard++ < 120) {
  const h = await heading().catch(() => '');
  if (/Campeão|Eliminado/.test(h)) break;

  const next = page
    .getByRole('button', {
      name: /Próximo round|Ver resultado da partida|Próxima fase|Ver resumo|Jogar o round|^Jogar |Repetir escalação/,
    })
    .first();
  if ((await next.count()) === 0) break;
  await next.click().catch(() => {});
  await page.waitForTimeout(220);

  const skip = page.getByRole('button', { name: 'Pular' });
  if (await skip.count()) await skip.click().catch(() => {});
  const seeResult = page.getByRole('button', { name: /Ver resultado do round/ });
  if (await seeResult.count()) await seeResult.click().catch(() => {});
  await page.waitForTimeout(150);
}

await page.screenshot({ path: `${OUT}/07-runend.png` });
console.log('final:', await heading().catch(() => '(none)'));
console.log('console errors:', errors.length ? errors.join(' | ') : 'none');

await browser.close();
