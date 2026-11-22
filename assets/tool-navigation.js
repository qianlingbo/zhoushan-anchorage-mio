/* ==========================================================================
   zsagent01.com — Unified Global Navigation, Theme & Footer Shell
   Works across Homepage, 5 Maritime Tools (/weather, /kaobo, /guanmen,
   /tide, /dues), Agent Skills Hub (/skills, /skill.html, /guanmen/skill),
   and Design System (/design-system.html).
   ========================================================================== */

(() => {
  const path = location.pathname.replace(/\/index\.html$/, '/');
  const firstSeg = path.split('/').filter(Boolean)[0] || '';

  let current = 'home';
  if (['weather', 'kaobo', 'guanmen', 'tide', 'dues', 'skills'].includes(firstSeg)) {
    current = (firstSeg === 'guanmen' && path.includes('/skill')) ? 'skills' : firstSeg;
  } else if (path === '/skill.html') {
    current = 'skills';
  } else if (path === '/design-system.html') {
    current = 'design';
  } else if (path !== '/' && path !== '') {
    // Do not inject onto unrelated pages like /game/, /game01/, /epda/
    return;
  }

  const isToolPage = ['weather', 'kaobo', 'guanmen', 'tide', 'dues'].includes(current);

  const NAV_ITEMS = [
    { id: 'home',    zh: '概览',     href: '/',         tag: 'HOME', desc: '舟山船舶代理笔记 · 工作台首页' },
    { id: 'weather', zh: '锚地天气', href: '/weather/', tag: '01',   desc: '条帚门 / 虾峙门外 / 马峙 / 秀山东 MIO 供油指数' },
    { id: 'kaobo',   zh: '靠泊窗口', href: '/kaobo/',   tag: '02',   desc: '10 大码头靠泊与到线时间 · 2026 定海潮汐' },
    { id: 'guanmen', zh: '灌门航窗', href: '/guanmen/', tag: '03',   desc: '马岙航道 C1 站缓流 + 航海曙暮光通航表' },
    { id: 'tide',    zh: '浅滩航道', href: '/tide/',    tag: '04',   desc: '河泥漕船舶过浅滩 / 过航槽 UKC 判断' },
    { id: 'dues',    zh: '吨税计算', href: '/dues/',    tag: '05',   desc: '77 国优惠税率 · 30日/90日/1年船舶吨税' },
    { id: 'skills',  zh: 'Agent Skills', href: '/skills/', tag: 'API', desc: 'Codex / Hermes / OpenClaw 一键接入指南' }
  ];

  // Ensure unified Google Fonts are available across all pages
  if (!document.querySelector('link[data-zs-fonts]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.dataset.zsFonts = '1';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Serif+SC:wght@600;700&display=swap';
    document.head.appendChild(fontLink);
  }

  // Theme management (synced between zs-theme & kaobo-theme)
  function getTheme() {
    try {
      const saved = localStorage.getItem('zs-theme') || localStorage.getItem('kaobo-theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {}
    return 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('zs-theme', theme);
      localStorage.setItem('kaobo-theme', theme);
    } catch {}
    const btn = document.getElementById('zs-theme-btn');
    if (btn) {
      const isDark = theme === 'dark';
      btn.setAttribute('aria-label', isDark ? '切换日间海图模式' : '切换夜航仪表模式');
      btn.innerHTML = isDark
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg><span class="theme-lbl">日间</span>'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span class="theme-lbl">夜航</span>';
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#0B151D' : '#F5F2EA');
  }

  // Toast & Copy helpers
  let toastTimer = null;
  function showToast(msg) {
    let el = document.getElementById('zs-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'zs-toast';
      el.className = 'site-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('is-visible'), 2400);
  }

  async function copyText(text, successMsg) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast(successMsg || '已复制到剪贴板');
    } catch {
      showToast('复制失败，请手动复制');
    }
  }

  window.zsCopy = copyText;
  window.zsToast = showToast;

  // Build Unified Header Wrapper
  const shellHeader = document.createElement('div');
  shellHeader.id = 'zs-unified-header';

  const hasBilingual = current === 'weather' || current === 'tide';
  const navHtml = NAV_ITEMS.map((item) => {
    const active = item.id === current ? ' aria-current="page"' : '';
    return `<a class="site-nav__link" href="${item.href}"${active}>${item.zh}</a>`;
  }).join('');

  const mobileHtml = NAV_ITEMS.map((item) => {
    const active = item.id === current ? ' aria-current="page"' : '';
    return `<a class="mobile-drawer__link" href="${item.href}"${active}>
      <span>${item.zh}</span>
      <span class="mono" style="font-size:12px;color:var(--ink-muted)">${item.tag}</span>
    </a>`;
  }).join('');

  shellHeader.innerHTML = `
    <header class="site-header" id="zs-top">
      <div class="container site-header__inner">
        <a class="site-brand" href="/" aria-label="舟山船舶代理笔记主页">
          <span class="site-brand__mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="22" stroke="#3DB8A8" stroke-width="3" stroke-opacity="0.45"/>
              <path d="M32 12L40 32L32 52L24 32L32 12Z" fill="#13635B" stroke="#EAF0F3" stroke-width="2.2" stroke-linejoin="round"/>
              <path d="M32 12L40 32H24L32 12Z" fill="#E06D5B"/>
              <circle cx="32" cy="32" r="3.5" fill="#FAF8F4"/>
            </svg>
          </span>
          <span class="site-brand__text">
            <span class="site-brand__name">舟山船舶代理笔记</span>
            <span class="site-brand__sub">ZSAGENT01 · MARITIME DESK</span>
          </span>
        </a>

        <nav class="site-nav" aria-label="主导航">
          ${navHtml}
        </nav>

        <div class="site-utils">
          <button type="button" class="util-btn util-btn--cmdk" id="zs-cmdk-btn" title="快速跳转 (⌘K)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <span class="kbd-hint">⌘K</span>
          </button>
          ${hasBilingual ? '<button type="button" class="util-btn" id="zs-lang-btn" title="切换中英文">EN</button>' : ''}
          <button type="button" class="util-btn" id="zs-theme-btn" title="切换日间海图 / 夜航仪表"></button>
          <button type="button" class="util-btn util-btn--wechat" id="zs-wechat-btn" title="点击复制微信号 zsagent01">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
            <span class="label-text mono">zsagent01</span>
          </button>
          <button type="button" class="mobile-toggle" id="zs-mobile-btn" aria-label="打开导航菜单" aria-expanded="false">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="mobile-drawer" id="zs-mobile-drawer">
      <div class="container">
        <div class="mobile-drawer__list">
          ${mobileHtml}
          <a class="mobile-drawer__link" href="/design-system.html">
            <span>统一设计规范</span>
            <span class="mono" style="font-size:12px;color:var(--ink-muted)">UI</span>
          </a>
        </div>
      </div>
    </div>

    <div class="cmdk-backdrop" id="zs-cmdk" aria-hidden="true">
      <div class="cmdk-dialog" role="dialog" aria-label="快速跳转">
        <div class="cmdk-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-muted)" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input type="text" class="cmdk-input" id="zs-cmdk-input" placeholder="输入工具名、锚地、码头或关键词快速跳转…" autocomplete="off" />
          <span class="kbd-hint">ESC</span>
        </div>
        <div class="cmdk-list" id="zs-cmdk-list"></div>
      </div>
    </div>
  `;

  // Build Unified Footer
  const shellFooter = document.createElement('footer');
  shellFooter.id = 'zs-unified-footer';
  shellFooter.className = 'site-footer';
  shellFooter.innerHTML = `
    <div class="container">
      <div class="site-footer__grid">
        <div>
          <div class="site-footer__brand">舟山船舶代理笔记</div>
          <p class="site-footer__quote">少一点噪音，多一点确定性。这里不是作品陈列柜，而是一张持续维护的舟山港航工作桌。</p>
          <div class="site-footer__contact">
            <span class="badge badge--neutral">公众号：舟山船舶代理笔记</span>
            <button type="button" class="util-btn util-btn--wechat mono" id="zs-footer-copy" style="height:30px;font-size:12px;">微信：zsagent01 · 复制</button>
          </div>
        </div>

        <div>
          <div class="site-footer__heading">港航工具目录</div>
          <ul class="site-footer__links">
            <li><a href="/weather/">01 · 锚地天气与 MIO 供油指数</a></li>
            <li><a href="/kaobo/">02 · 大型船舶靠泊时间窗口</a></li>
            <li><a href="/guanmen/">03 · 灌门航窗通航时间表</a></li>
            <li><a href="/tide/">04 · 河泥漕过浅滩 / 航槽判断</a></li>
            <li><a href="/dues/">05 · 中国船舶吨税计算器</a></li>
          </ul>
        </div>

        <div>
          <div class="site-footer__heading">开放生态与数据参考</div>
          <ul class="site-footer__links">
            <li><a href="/skills/">Agent Skills 接入中心（Codex / Hermes / OpenClaw）</a></li>
            <li><a href="/design-system.html">全站统一视觉设计规范</a></li>
            <li><a href="https://www.zs121.com.cn/Portarea/Portarea" target="_blank" rel="noopener">舟山海洋气象台 zs121.com.cn ↗</a></li>
            <li><a href="http://hai.tsphp.com/" target="_blank" rel="noopener">舟山海域潮汐潮流信息发布 ↗</a></li>
            <li><a href="https://www.timeanddate.com/sun/china/ningbo?year=2026" target="_blank" rel="noopener">timeanddate 宁波曙暮光 ↗</a></li>
          </ul>
        </div>
      </div>

      <div class="site-footer__bottom">
        <span>© 2026 zsagent01.com · 预报与计算结果仅作航行计划辅助，实际作业须以 VTS、引航及海事主管机关指令为准。</span>
        <a class="site-footer__top-btn" href="#zs-top">↑ 回到顶部</a>
      </div>
    </div>
  `;

  // Wire header & footer events
  function bindShellEvents() {
    if (shellHeader.dataset.bound) return;
    shellHeader.dataset.bound = '1';

    shellHeader.querySelector('#zs-theme-btn')?.addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      showToast(next === 'dark' ? '已切换至夜航仪表模式 (Night Watch)' : '已切换至日间海图模式 (Chart Paper)');
    });

    shellHeader.querySelector('#zs-wechat-btn')?.addEventListener('click', () => {
      copyText('zsagent01', '已复制个人微信号：zsagent01（公众号：舟山船舶代理笔记）');
    });

    shellFooter.querySelector('#zs-footer-copy')?.addEventListener('click', () => {
      copyText('zsagent01', '已复制微信号：zsagent01');
    });

    const mobileBtn = shellHeader.querySelector('#zs-mobile-btn');
    const drawer = shellHeader.querySelector('#zs-mobile-drawer');
    mobileBtn?.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      mobileBtn.setAttribute('aria-expanded', String(open));
    });

    // Bridge bilingual button on /weather/ and /tide/
    const langBtn = shellHeader.querySelector('#zs-lang-btn');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        if (current === 'weather') {
          const btns = document.querySelectorAll('.topbar .language-switch .language-button');
          if (btns.length >= 2) {
            const isEn = btns[1].classList.contains('is-active');
            btns[isEn ? 0 : 1].click();
            setTimeout(syncLangButton, 30);
          }
        } else if (current === 'tide') {
          const btns = document.querySelectorAll('.floating-tools .language-switch button');
          if (btns.length >= 2) {
            const isEn = btns[1].classList.contains('active');
            btns[isEn ? 0 : 1].click();
            setTimeout(syncLangButton, 30);
          }
        }
      });
    }

    // Command palette
    const backdrop = shellHeader.querySelector('#zs-cmdk');
    const input = shellHeader.querySelector('#zs-cmdk-input');
    const list = shellHeader.querySelector('#zs-cmdk-list');
    const openBtn = shellHeader.querySelector('#zs-cmdk-btn');
    const allItems = [
      ...NAV_ITEMS,
      { id: 'design', zh: '统一设计规范与改版对比', href: '/design-system.html', tag: 'SPEC', desc: '查看全站色板、字体、双主题与改版明细' }
    ];

    function renderCmdk(q = '') {
      const query = q.trim().toLowerCase();
      const filtered = allItems.filter((item) =>
        !query || `${item.zh} ${item.desc} ${item.tag} ${item.href}`.toLowerCase().includes(query)
      );
      list.innerHTML = filtered.length
        ? filtered.map((item, idx) => `
          <a class="cmdk-item${idx === 0 ? ' is-active' : ''}" href="${item.href}">
            <span class="cmdk-item__meta">
              <span class="cmdk-item__title">${item.zh}</span>
              <span class="cmdk-item__desc">${item.desc}</span>
            </span>
            <span class="cmdk-item__tag">${item.tag}</span>
          </a>`).join('')
        : '<div style="padding:20px;text-align:center;color:var(--ink-muted);font-size:13px;">未找到匹配的港航工具</div>';
    }

    function openCmdk() {
      backdrop.classList.add('is-open');
      backdrop.setAttribute('aria-hidden', 'false');
      input.value = '';
      renderCmdk('');
      setTimeout(() => input.focus(), 20);
    }

    function closeCmdk() {
      backdrop.classList.remove('is-open');
      backdrop.setAttribute('aria-hidden', 'true');
    }

    openBtn?.addEventListener('click', openCmdk);
    backdrop?.addEventListener('click', (e) => { if (e.target === backdrop) closeCmdk(); });
    input?.addEventListener('input', () => renderCmdk(input.value));
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = list.querySelector('.cmdk-item');
        if (first) location.href = first.getAttribute('href');
      }
    });

    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (current === 'dues' && document.activeElement?.tagName === 'INPUT') return;
        e.preventDefault();
        backdrop.classList.contains('is-open') ? closeCmdk() : openCmdk();
      } else if (e.key === 'Escape' && backdrop.classList.contains('is-open')) {
        closeCmdk();
      }
    });
  }

  function syncLangButton() {
    const langBtn = shellHeader.querySelector('#zs-lang-btn');
    if (!langBtn) return;
    if (current === 'weather') {
      const enBtn = document.querySelector('.topbar .language-switch .language-button[data-lang="en"]');
      const isEn = !!enBtn?.classList.contains('is-active');
      langBtn.textContent = isEn ? '中文' : 'EN';
    } else if (current === 'tide') {
      const btns = document.querySelectorAll('.floating-tools .language-switch button');
      const isEn = !!btns[1]?.classList.contains('active');
      langBtn.textContent = isEn ? '中文' : 'EN';
    }
  }

  const stylesheet = document.querySelector('link[href^="/assets/tool-polish.css"]');
  let isMounting = false;

  function mount() {
    if (isMounting || !document.body) return;
    isMounting = true;
    try {
      if (isToolPage) {
        if (!document.body.classList.contains('tool-page')) document.body.classList.add('tool-page');
        if (document.body.dataset.tool !== current) document.body.dataset.tool = current;
      }

      const headerSlot = document.getElementById('site-header-slot');
      if (headerSlot) {
        if (!shellHeader.isConnected) headerSlot.appendChild(shellHeader);
      } else if (!shellHeader.isConnected) {
        document.body.prepend(shellHeader);
      }

      const footerSlot = document.getElementById('site-footer-slot');
      if (footerSlot) {
        if (!shellFooter.isConnected) footerSlot.appendChild(shellFooter);
      } else if (!shellFooter.isConnected) {
        document.body.appendChild(shellFooter);
      }

      if (stylesheet && !stylesheet.isConnected) {
        document.head.appendChild(stylesheet);
      }

      bindShellEvents();
      const desiredTheme = getTheme();
      if (document.documentElement.getAttribute('data-theme') !== desiredTheme || !shellHeader.querySelector('#zs-theme-btn')?.innerHTML) {
        applyTheme(desiredTheme);
      }
      syncLangButton();
    } finally {
      isMounting = false;
    }
  }

  // Sync if /kaobo/ native theme button is clicked
  if (current === 'kaobo') {
    document.addEventListener('click', (e) => {
      if (e.target.closest('#theme-toggle')) {
        setTimeout(() => {
          const t = document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
          applyTheme(t);
        }, 20);
      }
    });
  }

  if (current === 'tide') {
    // Wait briefly so Next.js hydration completes cleanly without mismatch, then mount & observe body only.
    const startTideShell = () => {
      mount();
      let remounts = 0;
      const observer = new MutationObserver(() => {
        if (isMounting) return;
        if ((!shellHeader.isConnected || !shellFooter.isConnected) && remounts < 6) {
          remounts++;
          requestAnimationFrame(mount);
        } else {
          syncLangButton();
        }
      });
      if (document.body) {
        observer.observe(document.body, { childList: true });
      }
    };
    if (document.readyState === 'complete') {
      setTimeout(startTideShell, 180);
    } else {
      window.addEventListener('load', () => setTimeout(startTideShell, 180), { once: true });
    }
  } else {
    mount();
  }
})();
