(() => {
  const tools = [
    ['weather', '锚地天气'],
    ['kaobo', '靠泊窗口'],
    ['guanmen', '灌门航窗'],
    ['tide', '浅滩航道'],
    ['dues', '吨税计算器'],
  ];
  const current = location.pathname.split('/').filter(Boolean)[0];
  if (!tools.some(([route]) => route === current)) return;

  const navigation = document.createElement('nav');
  navigation.className = 'tool-site-nav';
  navigation.setAttribute('aria-label', '港航工具导航');
  const home = document.createElement('a');
  home.className = 'tool-site-home';
  home.href = '/';
  home.textContent = '舟山船舶代理笔记';
  const back = document.createElement('span');
  back.textContent = '返回主页';
  home.append(back);
  navigation.append(home);

  const contact = document.createElement('aside');
  contact.className = 'tool-site-contact';
  contact.setAttribute('aria-label', '公众号与个人微信联系方式');
  for (const text of ['公众号：舟山船舶代理笔记', '个人微信号：zsagent01']) {
    const line = document.createElement('span');
    line.textContent = text;
    contact.append(line);
  }
  let languageButtons = [];
  if (current === 'tide') {
    const languages = document.createElement('div');
    languages.className = 'tool-site-language';
    languages.setAttribute('role', 'group');
    languages.setAttribute('aria-label', '语言 / Language');
    languageButtons = ['中文', 'EN'].map((title, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = title;
      button.setAttribute('aria-pressed', 'false');
      button.disabled = true;
      button.addEventListener('click', () => {
        document.querySelectorAll('.floating-tools .language-switch button')[index]?.click();
      });
      languages.append(button);
      return button;
    });
    contact.append(languages);
  }
  navigation.append(contact);

  const links = document.createElement('div');
  links.className = 'tool-site-links';
  for (const [route, title] of tools) {
    const link = document.createElement('a');
    link.href = `/${route}/`;
    link.textContent = title;
    if (route === current) link.setAttribute('aria-current', 'page');
    links.append(link);
  }
  navigation.append(links);
  const stylesheet = document.querySelector('link[href^="/assets/tool-polish.css"]');
  const mount = () => {
    document.body.classList.add('tool-page');
    document.body.dataset.tool = current;
    if (!navigation.isConnected) document.body.prepend(navigation);
    if (stylesheet && !stylesheet.isConnected) document.head.append(stylesheet);
  };
  mount();

  // The exported tide app hydrates the document and can replace head/body nodes.
  if (current === 'tide') {
    // Keep the app-owned controls in place; relay selection through its existing handlers.
    const syncLanguage = () => {
      const originals = document.querySelectorAll('.floating-tools .language-switch button');
      languageButtons.forEach((button, index) => {
        const original = originals[index];
        button.disabled = !original;
        const selected = String(!!original?.classList.contains('active'));
        if (button.getAttribute('aria-pressed') !== selected) button.setAttribute('aria-pressed', selected);
      });
    };
    const observer = new MutationObserver(() => {
      if (!navigation.isConnected || (stylesheet && !stylesheet.isConnected)) mount();
      syncLanguage();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });
    syncLanguage();
  }
})();
