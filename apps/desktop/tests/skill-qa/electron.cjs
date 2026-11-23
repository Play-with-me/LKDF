const { app, BrowserWindow } = require('electron');
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const assert = require('node:assert/strict');

const desktop = resolve(__dirname, '../..');
const outputDir = join(desktop, 'release', 'skill-qa');
const manual = process.argv.includes('--manual');
app.setPath('userData', mkdtempSync(join(tmpdir(), 'lkdf-skill-qa-')));
app.disableHardwareAcceleration();
app.on('window-all-closed', () => {});

async function main() {
  const { createServer } = await import('vite');
  const server = await createServer({
    root: desktop,
    server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
  });
  const win = new BrowserWindow({
    show: false,
    width: 1280,
    height: 720,
    useContentSize: true,
    webPreferences: { backgroundThrottling: false },
  });
  try {
    await server.listen();
    const url = 'http://127.0.0.1:' + server.httpServer.address().port + '/tests/skill-qa/';
    await win.loadURL(url);
    if (manual) {
      await win.loadURL(url + '?manual');
      win.show();
      await new Promise(resolve => win.once('closed', resolve));
      return;
    }
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await win.webContents.executeJavaScript('typeof window.skillQaReplay === "function"')) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(await win.webContents.executeJavaScript('typeof window.skillQaReplay === "function"'),
      'Replay module did not load');

    const cases = require('./cases.json');
    const traces = JSON.parse(readFileSync(join(outputDir, 'traces.json'), 'utf8'));
    const casesBySkill = new Set(cases.map(entry => entry.skill));
    const { HERO_CATALOG } = await import('@lkdf/shared');
    const catalog = HERO_CATALOG.flatMap(hero => hero.skills.map(skill => skill.nameVi));
    assert.deepEqual([...casesBySkill].sort(), [...catalog].sort());
    assert.equal(cases.length, catalog.length);
    const results = [];
    for (const { width, height, reduced } of [
      { width: 1280, height: 720, reduced: false },
      { width: 1280, height: 720, reduced: true },
      { width: 960, height: 600, reduced: false },
      { width: 960, height: 600, reduced: true },
    ]) {
      win.setContentSize(width, height);
      for (let attempt = 0; attempt < 40; attempt++) {
        const viewport = await win.webContents.executeJavaScript('[innerWidth, innerHeight]');
        if (viewport[0] === width && viewport[1] === height) break;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      for (const entry of cases) {
        const trace = traces.filter(item => item.test.split(' > ').at(-1) === entry.test)[entry.step];
        assert.ok(trace, 'Missing record: ' + entry.skill);
        const spectator = entry.spectator ?? trace.before.findIndex((_view, seat) =>
          seat !== entry.actor && seat !== entry.affected);
        assert.ok(spectator >= 0);
        for (const [perspective, seat] of [['actor', entry.actor], ['affected', entry.affected], ['spectator', spectator]]) {
          assert.ok(trace.before[seat], entry.skill + ': missing ' + perspective);
          const result = await win.webContents.executeJavaScript(
            'window.skillQaReplay(' + JSON.stringify(trace) + ',' + seat + ',' + reduced + ')',
          );
          assert.deepEqual(result.viewport, [width, height], entry.skill + ': actual viewport');
          results.push({ skill: entry.skill, perspective, width, height, reduced, ...result });
        }
      }
      console.log(results.length + ' views rendered');
    }
    writeFileSync(join(outputDir, 'results.json'), JSON.stringify(results, null, 2));
    const issues = results.filter(item => item.hiddenHandExposed || item.leakedPrivateCards ||
      item.beforeUi.pageOverflow || item.afterUi.pageOverflow);
    console.log(cases.length + ' skills, ' + results.length + ' rendered views, ' + issues.length + ' privacy or document-overflow violations');
    assert.equal(issues.length, 0, issues.map(item => item.skill + ': ' + item.perspective).join(', '));
    for (const item of results) {
      if (['Phản Quỷ', 'Đột Tập'].includes(item.skill) && item.perspective === 'affected') {
        assert.ok(item.afterUi.alerts.some(alert => alert.includes(item.skill)), item.skill + ': alert');
        assert.ok(!item.afterUi.alerts.some(alert => alert.includes('Thuận Thủ Khiên Dương')));
      }
      if (['Nhân Đức', 'Di Kế'].includes(item.skill)) {
        assert.ok(item.afterUi.spotlight?.includes(item.skill), item.skill + ': notice');
        assert.equal(item.afterUi.transfers, item.reduced ? 0 : 1, item.skill + ': face-down transfer');
      }
      if (['Lưu Ly', 'Kết Hôn', 'Ly Gián', 'Thanh Nang'].includes(item.skill)) {
        assert.ok(!item.cues.includes('DAO') && !item.cues.includes('THIEM'), item.skill + ': discard cost');
      }
      if (['Long Đảm', 'Khuynh Quốc', 'Hộ Giá'].includes(item.skill)) {
        assert.ok(item.cues.includes('THIEM'), item.skill + ': real dodge');
      }
      if (['Cấp Cứu', 'Cứu Viện'].includes(item.skill)) {
        assert.ok(item.cues.includes('DAO'), item.skill + ': real rescue');
      }
      if (['Nhân Đức', 'Kích Tướng', 'Gian Hùng', 'Hộ Giá', 'Quỷ Tài', 'Thiên Đố',
        'Phản Gián', 'Lưu Ly', 'Kết Hôn', 'Di Kế'].includes(item.skill)) {
        assert.ok(item.afterUi.stamps.includes(item.skill), item.skill + ': canonical stamp');
      }
    }

    await win.loadURL(url + '?manual');
    const manualStatus = await win.webContents.executeJavaScript(`(async () => {
      const wait = () => new Promise(resolve => window.setTimeout(resolve, 75));
      let form = document.querySelector('form');
      for (let attempt = 0; attempt < 40 && !form; attempt++) {
        await wait();
        form = document.querySelector('form');
      }
      form.requestSubmit();
      const status = form.querySelector('[role="status"]');
      for (let attempt = 0; attempt < 40 && !status.textContent; attempt++) {
        await wait();
      }
      return status.textContent;
    })()`);
    assert.equal(manualStatus, cases[0].expected, 'Manual playback');
  } finally {
    if (!win.isDestroyed()) win.destroy();
    await server.close();
  }
}

app.whenReady().then(main).then(() => app.exit(0)).catch(error => {
  console.error(error);
  app.exit(1);
});
