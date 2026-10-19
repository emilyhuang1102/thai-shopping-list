(() => {
  'use strict';
  const grid = document.getElementById('grid');
  const filters = [...document.querySelectorAll('.filter')];
  const dialog = document.getElementById('item-dialog');
  const form = document.getElementById('item-form');
  const notice = document.getElementById('notice');
  const stateKey = 'thai-shopping-checklist-v1';
  const itemsKey = 'thai-shopping-custom-items-v1';
  const categories = {
    snack: '零食・飲品', meal: '料理・調理包', medicine: '藥品・舒緩',
    beauty: '彩妝保養', bags: '包包', lifestyle: '香氛・生活', other: '其他'
  };
  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  let state = read(stateKey, {});
  if (!state || typeof state !== 'object' || Array.isArray(state)) state = {};
  let items = read(itemsKey, []);
  if (!Array.isArray(items)) items = [];
  items = items.filter(item => item && typeof item.id === 'string' && item.id.startsWith('custom-') &&
    typeof item.name === 'string' && item.name.trim() && Object.hasOwn(categories, item.kind) &&
    Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 999);
  function tell(message) { notice.textContent = message; }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch { return false; }
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function customCard(item) {
    const card = element('article', 'card custom-item');
    card.dataset.id = item.id;
    card.dataset.kind = item.kind;
    const info = element('div', 'info info--compact');
    info.append(element('span', 'tag', categories[item.kind]), element('h3', '', item.name));
    if (typeof item.note === 'string' && item.note) info.append(element('p', 'desc', item.note));
    const variants = element('div', 'variants');
    variants.append(element('span', 'variant quantity', `數量：${item.quantity}`));
    info.append(variants);
    const remove = element('button', 'remove-item', '移除商品');
    remove.type = 'button';
    remove.dataset.remove = item.id;
    remove.setAttribute('aria-label', `移除 ${item.name}`);
    info.append(remove);
    const visual = element('div', 'visual');
    const placeholder = element('div', 'noimage', '🛍');
    placeholder.setAttribute('aria-hidden', 'true');
    const buy = element('label', 'buy');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', `${item.name} 買到了`);
    const checkIcon = element('span', 'buy-check', '✓');
    checkIcon.setAttribute('aria-hidden', 'true');
    buy.append(checkIcon, checkbox, document.createTextNode('買到了'));
    visual.append(placeholder, buy);
    card.append(info, visual);
    return card;
  }
  items.forEach(item => grid.append(customCard(item)));
  function render() {
    const selected = document.querySelector('.filter.active').dataset.filter;
    let shown = 0;
    grid.querySelectorAll('.card').forEach(card => {
      const checked = state[card.dataset.id] === true;
      const input = card.querySelector('.buy input');
      input.checked = checked;
      input.setAttribute('aria-label', `${card.querySelector('h3').textContent} 買到了`);
      card.classList.toggle('done', checked);
      const visible = selected === 'all' || (selected === 'todo' ? !checked : card.dataset.kind === selected);
      card.hidden = !visible;
      card.style.display = visible ? 'grid' : 'none';
      if (visible) shown++;
    });
    document.getElementById('empty').style.display = shown ? 'none' : 'block';
  }
  grid.addEventListener('change', event => {
    if (!event.target.matches('.buy input')) return;
    const card = event.target.closest('.card');
    const next = {...state, [card.dataset.id]: event.target.checked};
    if (!write(stateKey, next)) {
      tell('無法儲存勾選紀錄，請確認瀏覽器允許儲存網站資料。');
      render(); return;
    }
    state = next;
    tell(event.target.checked ? `已買到：${card.querySelector('h3').textContent}` : `已取消勾選：${card.querySelector('h3').textContent}`);
    render();
  });
  filters.forEach(button => button.addEventListener('click', () => {
    filters.forEach(filter => {
      filter.classList.toggle('active', filter === button);
      filter.setAttribute('aria-pressed', String(filter === button));
    });
    render();
  }));
  document.getElementById('reset').addEventListener('click', () => {
    if (!write(stateKey, {})) { tell('無法重設勾選紀錄，請確認瀏覽器允許儲存網站資料。'); return; }
    state = {};
    render();
    tell('已重設勾選，商品清單已保留。');
  });
  document.getElementById('add-item').addEventListener('click', () => {
    form.reset();
    document.getElementById('form-error').textContent = '';
    dialog.showModal();
    document.getElementById('item-name').focus();
  });
  document.getElementById('cancel-item').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  }});
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const name = String(data.get('name')).trim();
    const quantity = Number(data.get('quantity'));
    if (!name || !Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      document.getElementById('form-error').textContent = '請輸入商品名稱，數量請填 1 至 999 的整數。'; return;
    }
    const item = {
      id: 'custom-' + (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      name, quantity, kind: String(data.get('kind')), note: String(data.get('note')).trim()
    };
    if (!Object.hasOwn(categories, item.kind)) return;
    const next = [...items, item];
    if (!write(itemsKey, next)) {
      document.getElementById('form-error').textContent = '無法儲存商品，請確認瀏覽器允許儲存網站資料。'; return;
    }
    items = next;
    const card = customCard(item);
    grid.append(card);
    filters.forEach(button => {
      const active = button.dataset.filter === 'all';
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    render();
    dialog.close();
    tell(`已新增「${item.name}」，數量 ${item.quantity}。`);
    card.scrollIntoView({behavior: 'smooth', block: 'center'});
  });
  grid.addEventListener('click', event => {
    const remove = event.target.closest('[data-remove]');
    if (!remove) return;
    const item = items.find(item => item.id === remove.dataset.remove);
    if (!item || !confirm(`要移除「${item.name}」嗎？`)) return;
    const next = items.filter(entry => entry.id !== item.id);
    if (!write(itemsKey, next)) { tell('無法移除商品，請確認瀏覽器允許儲存網站資料。'); return; }
    items = next;
    remove.closest('.card').remove();
    delete state[item.id];
    write(stateKey, state);
    render();
    tell(`已移除「${item.name}」。`);
  });
  const preview = document.getElementById('preview');
  const previewImg = preview.querySelector('img');
  let previewTrigger;
  document.querySelectorAll('.zoom').forEach(button => button.addEventListener('click', () => {
    const source = button.closest('.visual').querySelector('img');
    if (!source) return;
    previewTrigger = button;
    previewImg.src = source.src;
    previewImg.alt = source.alt;
    preview.classList.add('open');
    document.body.style.overflow = 'hidden';
    preview.querySelector('button').focus();
  }));
  function closePreview() {
    preview.classList.remove('open');
    document.body.style.overflow = '';
    previewTrigger?.focus();
  }
  preview.querySelector('.preview-close').addEventListener('click', closePreview);
  preview.addEventListener('click', event => { if (event.target === preview) closePreview(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && preview.classList.contains('open')) closePreview(); });
  filters.forEach(button => button.setAttribute('aria-pressed', String(button.classList.contains('active'))));
  render();
})();
