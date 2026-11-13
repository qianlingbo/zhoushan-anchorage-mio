import { CHAPTERS, freshJourney, selectChapter, recordEncounter, chapterProgress, completedChapters, restoreJourney, updateSettings, resolveDecision, voyageStatus } from './journey.mjs';
import { createAmbient } from './ambience.mjs';
import { PAINTED_CHAPTERS } from './painted-chapters.mjs';

const SAVE_KEY = 'wukong-nantian-v1';

export async function mountJourney({ document = globalThis.document, storage, loadInkWorld = () => import('./ink-world.mjs'), confirmReset, createAudio } = {}) {
  const view = document.defaultView;
  const $ = id => document.getElementById(id);
  if (!storage) { try { storage = view.localStorage; } catch { /* Session-only progress remains usable. */ } }
  let saved; try { saved = storage?.getItem(SAVE_KEY); } catch { /* Storage may be disabled. */ }
  let state = restoreJourney(saved), world, sceneReady = false;
  let screen = 'cover', conversation = null, loading = false, disposed = false, toastTimer;
  let currentChapter, worldGeneration = 0;
  const removers = [], touchHeld = new Set();
  const audio = createAudio ? createAudio() : createAmbient(view);
  const on = (element, event, callback, options) => {
    element.addEventListener(event, callback, options);
    removers.push(() => element.removeEventListener(event, callback, options));
  };
  const toast = message => {
    if (disposed) return;
    $('toast').textContent = message; $('toast').hidden = false;
    view.clearTimeout(toastTimer);
    toastTimer = view.setTimeout(() => { $('toast').hidden = true; }, 6500);
  };
  const persist = () => {
    try { storage?.setItem(SAVE_KEY, JSON.stringify(state)); }
    catch { toast('浏览器未允许保存；本次南天门委托仍可继续。'); }
  };
  const chapter = () => CHAPTERS.find(item => item.id === state.selected);
  const focusChapter = () => $('chapter-grid').querySelector(`[data-chapter="${state.selected}"]`)?.focus();
  const activeCanvas = () => $('ink-world');
  const disposeWorld = () => {
    worldGeneration++; world?.dispose(); world = undefined; currentChapter = undefined;
    sceneReady = false;
    $('interact-button').hidden = true;
  };
  const paused = () => disposed || screen !== 'play' || !sceneReady || ['dialogue', 'settings', 'voyage-dialog', 'ending'].some(id => $(id).open) || document.hidden;
  const syncPause = () => { world?.setPaused(paused()); audio.setPaused(paused()); };
  const updateGoal = () => {
    const progress = chapterProgress(state, state.selected);
    const voyage = voyageStatus(state);
    $('chapter-label').textContent = chapter().title;
    $('goal-text').textContent = `${progress.count} / ${progress.total} 件委托 · ${voyage.seals.filter(seal => seal.complete).length}/4 印`;
  };
  const refreshVoyage = () => {
    const voyage = voyageStatus(state);
    $('seal-progress').replaceChildren();
    for (const seal of voyage.seals) {
      const stamp = document.createElement('span'); stamp.className = `seal-mark${seal.complete ? ' complete' : ''}`;
      stamp.textContent = seal.name; stamp.setAttribute('aria-label', `${seal.name}${seal.complete ? '已获' : '待办'}`);
      $('seal-progress').append(stamp);
    }
    $('voyage-summary').textContent = voyage.finished ? '筋斗云号已平安交船。齐天大代，仍可继续漫游。' : voyage.canDepart ? '四印、委托与避台事项已核对，可以回南天门交船。' : '四殿可自由往来，交船前仍需确认以下事项：';
    $('voyage-details').replaceChildren();
    for (const missing of voyage.missing) { const row = document.createElement('li'); row.textContent = missing; $('voyage-details').append(row); }
    return voyage;
  };
  const refreshAtlas = () => {
    for (const button of $('chapter-grid').querySelectorAll('[data-chapter]')) {
      button.setAttribute('aria-pressed', String(button.dataset.chapter === state.selected));
      button.classList.toggle('completed', chapterProgress(state, button.dataset.chapter).complete);
    }
    $('chapter-title').textContent = chapter().title;
    $('chapter-description').textContent = chapter().description;
    $('chapter-style').textContent = PAINTED_CHAPTERS[state.selected].style;
    const voyage = refreshVoyage();
    $('chapter-progress').textContent = `四方印记 · ${voyage.seals.filter(seal => seal.complete).length} / 4 ｜ 已巡 ${completedChapters(state)} / 8 境`;
    updateGoal();
  };
  const showScreen = next => {
    screen = next; document.body.dataset.screen = next;
    for (const id of ['cover', 'atlas', 'play']) $(id).hidden = id !== next;
    touchHeld.clear(); world?.setMoveInput(0, 0);
    if (next === 'atlas') refreshAtlas();
    if (next === 'play') world?.resize();
    syncPause();
  };

  for (const [index, item] of CHAPTERS.entries()) {
    const button = document.createElement('button'); button.type = 'button';
    button.dataset.chapter = item.id; button.dataset.index = String(index);
    const art = document.createElement('span'); art.className = 'planet-art'; art.setAttribute('aria-hidden', 'true');
    art.style.backgroundImage = `url("${new URL(PAINTED_CHAPTERS[item.id].background, import.meta.url).href}")`;
    const name = document.createElement('span'); name.className = 'planet-name'; name.textContent = item.realm;
    const office = document.createElement('span'); office.className = 'planet-office'; office.textContent = item.name; office.hidden = item.realm.includes(item.name);
    const medium = document.createElement('span'); medium.className = 'chapter-medium'; medium.textContent = PAINTED_CHAPTERS[item.id].style;
    button.append(art, name, office, medium); $('chapter-grid').append(button);
    on(button, 'click', () => {
      if (loading || disposed) return;
      state = selectChapter(state, item.id); persist(); refreshAtlas();
      void enterChapter();
    });
  }

  const applyReadiness = notice => {
    if (disposed) return;
    sceneReady = !!notice.ok;
    $('loading-status').hidden = true;
    if (sceneReady) {
      updateGoal(); syncPause();
    } else {
      showScreen('atlas'); toast(notice.message || '画卷暂未展开，请返回云图后重试。');
      disposeWorld();
      focusChapter();
    }
  };
  const renderDialogue = () => {
    const lines = chapter().encounters[conversation.id];
    const decision = chapter().decisions[conversation.id];
    const choosing = conversation.page === lines.length - 1 && !conversation.resolved;
    $('dialogue-speaker').textContent = `${chapter().host} · ${chapter().name}`;
    $('dialogue-title').textContent = lines[0];
    $('dialogue-text').textContent = lines[conversation.page] + (choosing ? `\n${decision.prompt}` : '');
    $('dialogue-options').replaceChildren(); $('dialogue-options').hidden = !choosing;
    if (choosing) for (const [index, option] of decision.options.entries()) {
      const button = document.createElement('button'); button.type = 'button';
      button.dataset.option = String(index); button.textContent = option.text;
      $('dialogue-options').append(button);
    }
    $('decision-feedback').hidden = !conversation.feedback;
    $('decision-feedback').textContent = conversation.feedback || '';
    $('dialogue-next').hidden = choosing;
    $('dialogue-next').textContent = conversation.page === lines.length - 1 ? '记入航行日志 ✦' : '继续 →';
  };
  const beginConversation = node => {
    if (paused() || !Object.hasOwn(chapter().encounters, node.id)) return;
    if (state.selected === 'nantian' && node.id === 'departure' && !voyageStatus(state).canDepart) {
      refreshVoyage(); $('voyage-dialog').showModal(); syncPause(); return;
    }
    conversation = { id: node.id, page: 1, resolved: false };
    renderDialogue(); $('dialogue').showModal(); syncPause();
  };
  on($('begin'), 'click', () => { audio.start(); showScreen('atlas'); focusChapter(); });
  on($('back-cover'), 'click', () => { showScreen('cover'); $('begin').focus(); });
  async function enterChapter() {
    if (loading || disposed) return;
    if (currentChapter !== state.selected) {
      sceneReady = false; $('interact-button').hidden = true;
    }
    $('play-hint').textContent = '点击画中道路 · 行走　← → · 移动　靠近巡游仙人 · E 交谈　空格 · 跳跃';
    activeCanvas().setAttribute('aria-label', `可点击行走与交谈的${chapter().realm} · ${PAINTED_CHAPTERS[state.selected].style}画卷`);
    document.body.dataset.realm = state.selected;
    loading = true; $('loading-status').hidden = false;
    $('loading-status').textContent = `正在展开${chapter().realm} · ${PAINTED_CHAPTERS[state.selected].style}……`; showScreen('play');
    try {
      if (!world) {
        const { InkWorld } = await loadInkWorld();
        if (disposed) return;
        const generation = ++worldGeneration;
        const current = () => !disposed && generation === worldGeneration;
        let initialNotice;
        world = new InkWorld(activeCanvas(), {
          onReady: notice => { if (!current()) return; initialNotice = notice; queueMicrotask(() => { if (current()) applyReadiness(notice); }); },
          onNear: node => { if (!current()) return; $('interact-button').hidden = !node; if (node) $('interaction-label').textContent = `${chapter().host} · ${node.label}`; },
          onInteract: node => { if (current()) beginConversation(node); },
          reducedMotion: view.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false,
        });
        if (initialNotice && !initialNotice.ok && !initialNotice.sceneReady) return;
      }
      if (currentChapter !== state.selected) { world.startChapter(state.selected); currentChapter = state.selected; }
      world.setSensitivity(state.settings.sensitivity); world.resize();
      if (sceneReady) $('loading-status').hidden = true;
      syncPause();
      activeCanvas().focus();
    } catch (error) {
      disposeWorld();
      showScreen('atlas'); $('loading-status').hidden = true;
      toast(`场景暂未启动：${error.message}`);
      focusChapter();
    } finally { loading = false; }
  }
  on($('open-map'), 'click', () => { showScreen('atlas'); focusChapter(); });
  on($('open-log'), 'click', () => { refreshVoyage(); $('voyage-dialog').showModal(); syncPause(); });
  on($('voyage-close'), 'click', () => $('voyage-dialog').close());
  on($('ending-close'), 'click', () => $('ending').close());
  for (const id of ['voyage-dialog', 'ending']) on($(id), 'close', () => { syncPause(); if (!disposed) activeCanvas().focus(); });
  on($('interact-button'), 'click', () => world?.interact());
  for (const id of ['touch-jump', 'jump-button']) on($(id), 'click', () => world?.requestJump());
  on($('dialogue-close'), 'click', () => $('dialogue').close());
  on($('dialogue'), 'close', () => { conversation = null; syncPause(); if (!disposed) activeCanvas().focus(); });
  on($('dialogue-options'), 'click', event => {
    const button = event.target.closest?.('button[data-option]');
    if (!conversation || !button || conversation.resolved) return;
    const index = Number(button.dataset.option);
    const result = resolveDecision(state.selected, conversation.id, index);
    conversation.resolved = result.correct; conversation.feedback = result.feedback;
    renderDialogue();
    if (result.correct) $('dialogue-next').focus();
    else $('dialogue-options').querySelector(`[data-option="${index}"]`).focus();
  });
  on($('dialogue-next'), 'click', () => {
    if (!conversation) return;
    const lines = chapter().encounters[conversation.id];
    if (conversation.page < lines.length - 1) { conversation.page++; renderDialogue(); }
    else if (conversation.resolved) {
      const finishing = state.selected === 'nantian' && conversation.id === 'departure';
      state = recordEncounter(state, state.selected, conversation.id); persist(); refreshAtlas();
      $('dialogue').close();
      if (finishing) { $('ending').showModal(); syncPause(); }
      else toast('一件委托有了回音，已记入通关簿。');
    }
  });
  const openSettings = () => { if (screen === 'play' && !['settings', 'dialogue', 'voyage-dialog', 'ending'].some(id => $(id).open)) { $('settings').showModal(); syncPause(); } };
  on($('open-settings'), 'click', openSettings);
  on($('settings-close'), 'click', () => $('settings').close());
  on($('settings'), 'close', () => { syncPause(); if (!disposed) activeCanvas().focus(); });
  for (const id of ['volume']) {
    $(id).value = String(state.settings[id]);
    on($(id), 'input', () => {
      state = updateSettings(state, { [id]: Number($(id).value) }); persist();
      audio.setVolume(state.settings.volume); world?.setSensitivity(state.settings.sensitivity);
    });
  }
  on($('reset-progress'), 'click', () => {
    const confirm = confirmReset || (() => view.confirm('确定重接这一航次，清除当前南天门委托进度吗？此操作无法撤回。'));
    if (!confirm()) return;
    state = { ...freshJourney(), settings: state.settings }; persist(); refreshAtlas();
    $('settings').close(); showScreen('atlas'); focusChapter();
  });
  const sendTouch = () => world?.setMoveInput(Number(touchHeld.has('right')) - Number(touchHeld.has('left')), Number(touchHeld.has('back')) - Number(touchHeld.has('forward')));
  for (const button of document.querySelectorAll('[data-move]')) {
    on(button, 'pointerdown', event => { if (paused()) return; event.preventDefault(); button.setPointerCapture?.(event.pointerId); touchHeld.add(button.dataset.move); sendTouch(); });
    const release = () => { touchHeld.delete(button.dataset.move); sendTouch(); };
    on(button, 'pointerup', release); on(button, 'pointercancel', release); on(button, 'lostpointercapture', release);
  }
  on(view, 'keydown', event => {
    if (event.repeat || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || screen !== 'play') return;
    if (['dialogue', 'settings', 'voyage-dialog', 'ending'].some(id => $(id).open)) return;
    if (event.code === 'Escape') { event.preventDefault(); openSettings(); }
    if (event.code === 'KeyE') { event.preventDefault(); world?.interact(); }
    if (event.code === 'Tab') { event.preventDefault(); showScreen('atlas'); focusChapter(); }
  });
  on(view, 'blur', () => { touchHeld.clear(); world?.setMoveInput(0, 0); audio.setPaused(true); });
  on(view, 'focus', syncPause); on(document, 'visibilitychange', syncPause);
  on(view, 'pageshow', syncPause);
  on(view, 'pagehide', event => {
    if (event.persisted) { world?.setPaused(true); audio.setPaused(true); }
    else app.dispose();
  });
  audio.setVolume(state.settings.volume); refreshAtlas(); showScreen('cover');
  const app = { dispose() {
    if (disposed) return;
    disposed = true; view.clearTimeout(toastTimer); removers.forEach(remove => remove());
    disposeWorld(); audio.dispose();
    for (const id of ['dialogue', 'settings', 'voyage-dialog', 'ending']) if ($(id).open) $(id).close();
  } };
  return app;
}

if (typeof window !== 'undefined' && !window.__JOURNEY_TEST__) {
  mountJourney();
}
