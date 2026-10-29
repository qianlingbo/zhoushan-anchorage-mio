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
    const observer = new MutationObserver(() => {
      if (!navigation.isConnected || (stylesheet && !stylesheet.isConnected)) mount();
    });
    observer.observe(document.documentElement, { childList:true, subtree:true });
  }
})();
