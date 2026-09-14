(() => {
  const preferentialCountries = [
    '阿尔巴尼亚','朝鲜','加纳','斯里兰卡','刚果（布）','巴基斯坦','刚果（金）(原扎伊尔)','挪威','日本','阿尔及利亚','新西兰','阿根廷','孟加拉国','泰国','巴西','墨西哥','马来西亚','新加坡','塞浦路斯','蒙古','马耳他','越南','土耳其','韩国','格鲁吉亚','克罗地亚','俄罗斯','乌克兰','黎巴嫩','智利','印度','以色列','加拿大','秘鲁','埃及','摩洛哥','南非','古巴','印度尼西亚','突尼斯','伊朗','巴哈马','美国','比利时','捷克','丹麦','德国','爱沙尼亚','希腊','西班牙','法国','爱尔兰','意大利','拉脱维亚','立陶宛','卢森堡','匈牙利','荷兰','奥地利','波兰','葡萄牙','斯洛文尼亚','斯洛伐克','芬兰','瑞典','英国','保加利亚','罗马尼亚','也门','苏丹','菲律宾','埃塞俄比亚','肯尼亚','阿曼','利比里亚','巴拿马','香港','澳门'
  ];
  const chinaAliases = ['中国','中国大陆','中华人民共和国'];
  const brackets = [
    { label: '不超过 2,000', max: 2000, ordinary: [12.6, 4.2, 2.1], preferential: [9, 3, 1.5] },
    { label: '超过 2,000 · 不超过 10,000', max: 10000, ordinary: [24, 8, 4], preferential: [17.4, 5.8, 2.9] },
    { label: '超过 10,000 · 不超过 50,000', max: 50000, ordinary: [27.6, 9.2, 4.6], preferential: [19.8, 6.6, 3.3] },
    { label: '超过 50,000', max: Infinity, ordinary: [31.8, 10.6, 5.3], preferential: [22.8, 7.6, 3.8] }
  ];
  const durationIndex = { 30: 0, 90: 1, 365: 2 };
  const $ = (id) => document.getElementById(id);
  const countryInput = $('country');
  const tonnageInput = $('tonnage');
  const typeInput = $('vessel-type');
  const form = $('tax-form');
  const error = $('form-error');

  const options = $('country-options');
  [...chinaAliases, ...preferentialCountries].forEach((country) => {
    const option = document.createElement('option'); option.value = country; options.appendChild(option);
  });
  const chips = $('country-chips');
  preferentialCountries.forEach((country) => {
    const chip = document.createElement('span'); chip.className = 'country-chip'; chip.textContent = country; chip.dataset.country = country; chips.appendChild(chip);
  });

  const formatMoney = (value) => value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatNumber = (value) => value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const countryIsPreferential = (name) => chinaAliases.includes(name.trim()) || preferentialCountries.includes(name.trim());
  const selectedDuration = () => form.querySelector('input[name="duration"]:checked').value;

  function renderRateTable(selectedBracket, preferential) {
    $('rate-table-body').innerHTML = brackets.map((row, index) => {
      const values = (preferential ? row.preferential : row.ordinary).map((value) => value.toFixed(1).replace('.0', '')).join(' / ');
      const otherValues = (preferential ? row.ordinary : row.preferential).map((value) => value.toFixed(1).replace('.0', '')).join(' / ');
      return `<tr class="rate-row ${index === selectedBracket ? 'is-selected' : ''}"><td>${row.label}</td><td class="ordinary-values">${preferential ? otherValues : values}</td><td class="preferential-values">${preferential ? values : otherValues}</td></tr>`;
    }).join('');
  }

  function update() {
    const tonnage = Number(tonnageInput.value);
    const country = countryInput.value.trim();
    const preferential = countryIsPreferential(country);
    const duration = selectedDuration();
    const type = typeInput.value;
    const factor = type === 'standard' ? 1 : 0.5;
    const bracketIndex = brackets.findIndex((row) => tonnage <= row.max);
    const valid = Number.isFinite(tonnage) && tonnage > 0 && bracketIndex >= 0;

    document.querySelectorAll('.duration-option').forEach((label) => label.classList.toggle('is-active', label.querySelector('input').checked));
    $('rate-kind').textContent = preferential ? `${country || '中国'} · 优惠税率` : '普通税率';
    $('country-hint-text').textContent = preferential ? '中国籍及清单内船籍适用优惠税率' : '未列入优惠清单，按其他应税船舶普通税率计征';
    document.querySelectorAll('.country-chip').forEach((chip) => chip.classList.toggle('is-highlight', chip.dataset.country === country));

    if (!valid) {
      error.hidden = false; error.textContent = '请输入大于 0 的船舶净吨位。';
      $('tax-amount').textContent = '—'; $('applied-rate').innerHTML = '—'; $('billable-tonnage').innerHTML = '—'; $('formula-text').textContent = '等待有效吨位';
      return;
    }
    error.hidden = true;
    const rate = (preferential ? brackets[bracketIndex].preferential : brackets[bracketIndex].ordinary)[durationIndex[duration]];
    const amount = tonnage * rate * factor;
    const typeLabel = type === 'standard' ? '普通船舶' : type === 'tug' ? '拖船' : '非机动驳船';
    $('result-badge').textContent = preferential ? '优惠税率' : '普通税率';
    $('tax-amount').textContent = formatMoney(amount);
    $('result-caption').textContent = `${country || '未填写船籍'} · ${duration === '365' ? '1 年' : `${duration} 日`} · ${typeLabel}`;
    $('applied-rate').innerHTML = `${rate.toFixed(2)} <small>元/净吨</small>`;
    $('billable-tonnage').innerHTML = `${formatNumber(tonnage)} <small>NT</small>`;
    $('vessel-factor').textContent = `${factor * 100}%`;
    $('formula-text').textContent = `${formatNumber(tonnage)} × ${rate.toFixed(2)} × ${factor * 100}%`;
    renderRateTable(bracketIndex, preferential);
  }

  form.addEventListener('input', update);
  form.addEventListener('change', update);
  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); countryInput.focus(); countryInput.select(); }
  });
  update();
})();
