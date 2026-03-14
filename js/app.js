/* ============================================================
   Productivity Dashboard — js/app.js
   Vanilla JS · No frameworks · Local Storage persistence
   ============================================================ */

'use strict';

/* ── Storage helpers ─────────────────────────────────────── */
const Storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota */ }
  }
};

/* ── Theme ───────────────────────────────────────────────── */
const Theme = {
  KEY: 'pd-theme',
  init() {
    const saved = Storage.get(this.KEY, 'light');
    this.apply(saved);
    document.getElementById('theme-toggle').addEventListener('click', () => this.toggle());
  },
  apply(theme) {
    document.body.setAttribute('data-theme', theme);
    document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
    Storage.set(this.KEY, theme);
  },
  toggle() {
    this.apply(document.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }
};

/* ── Greeting (time + date + greeting text) ──────────────── */
const Greeting = {
  init() { this.tick(); setInterval(() => this.tick(), 1000); },
  tick() {
    const now  = new Date();
    const h    = now.getHours();
    const m    = now.getMinutes();
    const s    = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 || 12;
    const pad  = n => String(n).padStart(2, '0');

    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];

    document.getElementById('time-display').textContent =
      `${h12}:${pad(m)}:${pad(s)} ${ampm}`;

    document.getElementById('date-display').textContent =
      `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

    const greetings = [
      [5,  12, 'Good Morning ☀️'],
      [12, 17, 'Good Afternoon 🌤️'],
      [17, 21, 'Good Evening 🌆'],
      [0,  24, 'Good Night 🌙']
    ];
    const [,, text] = greetings.find(([start, end]) => h >= start && h < end)
                   || greetings[3];
    document.getElementById('greeting-text').textContent = text;
  }
};

/* ── Focus Timer ─────────────────────────────────────────── */
const Timer = {
  TOTAL: 25 * 60,
  remaining: 25 * 60,
  running: false,
  interval: null,

  init() {
    this.display = document.getElementById('timer-display');
    this.complete = document.getElementById('timer-complete');
    document.getElementById('timer-start').addEventListener('click', () => this.start());
    document.getElementById('timer-stop').addEventListener('click',  () => this.stop());
    document.getElementById('timer-reset').addEventListener('click', () => this.reset());
    this.render();
  },

  start() {
    if (this.running) return;
    this.running = true;
    this.complete.classList.add('hidden');
    this.interval = setInterval(() => this.tick(), 1000);
  },

  stop() {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.interval);
    this.interval = null;
  },

  reset() {
    this.stop();
    this.remaining = this.TOTAL;
    this.complete.classList.add('hidden');
    this.render();
  },

  tick() {
    if (this.remaining <= 0) { this.stop(); return; }
    this.remaining--;
    this.render();
    if (this.remaining === 0) {
      this.complete.classList.remove('hidden');
    }
  },

  render() {
    const m = Math.floor(this.remaining / 60);
    const s = this.remaining % 60;
    this.display.textContent =
      `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
};

/* ── Task Manager ────────────────────────────────────────── */
const Tasks = {
  KEY: 'pd-tasks',
  items: [],

  init() {
    this.list  = document.getElementById('task-list');
    this.input = document.getElementById('task-input');
    this.items = Storage.get(this.KEY, []);

    document.getElementById('task-form').addEventListener('submit', e => {
      e.preventDefault();
      this.add(this.input.value);
    });

    document.getElementById('sort-status').addEventListener('click', () => this.sort('status'));
    document.getElementById('sort-alpha').addEventListener('click',  () => this.sort('alpha'));

    this.render();
  },

  add(raw) {
    const text = raw.trim();
    if (!text) return this.shake(this.input);

    // Prevent duplicates (case-insensitive)
    if (this.items.some(t => t.text.toLowerCase() === text.toLowerCase())) {
      this.flash(this.input, 'Duplicate task!');
      return;
    }

    this.items.push({ id: Date.now(), text, done: false });
    this.input.value = '';
    this.save();
    this.render();
  },

  toggle(id) {
    const t = this.items.find(t => t.id === id);
    if (t) { t.done = !t.done; this.save(); this.render(); }
  },

  remove(id) {
    this.items = this.items.filter(t => t.id !== id);
    this.save();
    this.render();
  },

  edit(id, newText) {
    const text = newText.trim();
    if (!text) return;
    const t = this.items.find(t => t.id === id);
    if (t) { t.text = text; this.save(); this.render(); }
  },

  sort(by) {
    if (by === 'alpha') {
      this.items.sort((a, b) => a.text.localeCompare(b.text));
    } else {
      // status: incomplete first, then alphabetical within each group
      this.items.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return a.text.localeCompare(b.text);
      });
    }
    this.save();
    this.render();
  },

  save() { Storage.set(this.KEY, this.items); },

  render() {
    this.list.innerHTML = '';
    this.items.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task-item' + (task.done ? ' done' : '');

      // Checkbox
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.done;
      cb.setAttribute('aria-label', 'Mark done');
      cb.addEventListener('change', () => this.toggle(task.id));

      // Text span
      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;

      // Actions
      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.textContent = '✏️';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => this.startEdit(task.id, span, li));

      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon';
      delBtn.textContent = '🗑️';
      delBtn.setAttribute('aria-label', 'Delete task');
      delBtn.addEventListener('click', () => this.remove(task.id));

      actions.append(editBtn, delBtn);
      li.append(cb, span, actions);
      this.list.appendChild(li);
    });
  },

  startEdit(id, span, li) {
    const input = document.createElement('input');
    input.className = 'task-edit-input';
    input.value = span.textContent;
    span.replaceWith(input);
    input.focus();

    const commit = () => {
      const val = input.value.trim();
      if (val) this.edit(id, val);
      else this.render(); // revert
    };

    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commit(); }
      if (e.key === 'Escape') this.render();
    });
  },

  // Visual feedback helpers
  shake(el) {
    el.style.borderColor = '#dc3545';
    setTimeout(() => { el.style.borderColor = ''; }, 1000);
  },

  flash(el, msg) {
    el.style.borderColor = '#ffc107';
    el.setAttribute('title', msg);
    setTimeout(() => { el.style.borderColor = ''; el.removeAttribute('title'); }, 1500);
  }
};

/* ── Quick Links ─────────────────────────────────────────── */
const Links = {
  KEY: 'pd-links',
  items: [],

  init() {
    this.container = document.getElementById('links-list');
    this.nameInput = document.getElementById('link-name');
    this.urlInput  = document.getElementById('link-url');
    this.items = Storage.get(this.KEY, []);

    document.getElementById('link-form').addEventListener('submit', e => {
      e.preventDefault();
      this.add(this.nameInput.value, this.urlInput.value);
    });

    this.render();
  },

  add(rawName, rawUrl) {
    const name = rawName.trim();
    const url  = rawUrl.trim();

    if (!name) return this.shake(this.nameInput);
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
      return this.shake(this.urlInput);
    }

    this.items.push({ id: Date.now(), name, url });
    this.nameInput.value = '';
    this.urlInput.value  = '';
    this.save();
    this.render();
  },

  remove(id) {
    this.items = this.items.filter(l => l.id !== id);
    this.save();
    this.render();
  },

  save() { Storage.set(this.KEY, this.items); },

  render() {
    this.container.innerHTML = '';
    this.items.forEach(link => {
      const chip = document.createElement('a');
      chip.className = 'link-chip';
      chip.href = link.url;
      chip.target = '_blank';
      chip.rel = 'noopener noreferrer';
      chip.textContent = link.name;

      const del = document.createElement('button');
      del.className = 'link-del';
      del.textContent = '×';
      del.setAttribute('aria-label', `Remove ${link.name}`);
      del.addEventListener('click', e => {
        e.preventDefault();
        this.remove(link.id);
      });

      chip.appendChild(del);
      this.container.appendChild(chip);
    });
  },

  shake(el) {
    el.style.borderColor = '#dc3545';
    setTimeout(() => { el.style.borderColor = ''; }, 1000);
  }
};

/* ── Boot ────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  Greeting.init();
  Timer.init();
  Tasks.init();
  Links.init();
});
