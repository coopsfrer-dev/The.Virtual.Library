// Typing speed: milliseconds per character (100 / 1.5 = 1.5x faster than 0.1 second).
const SPEED = 100 / 1.5;
// Speed of the book details that type out when you hover a book (0.01 second).
const HOVER_SPEED = 10;

// The two shelves below the home page. Add or rename them here.
const SHELVES = [
  { id: 'read', statuses: ['read'], heading: 'Read' },
  { id: 'unread', statuses: ['reading', 'to-read'], heading: 'Unread' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const div = cls => { const d = document.createElement('div'); d.className = cls; return d; };

// ---------- typing ----------

// Click or press any key to finish whatever is typing right now.
const runs = new Set();
['click', 'keydown'].forEach(ev => addEventListener(ev, () => runs.forEach(r => { r.skipped = true; })));

// Types the text of one element, one character at a time.
async function typeEl(el, run) {
  const text = el.dataset.type;
  el.classList.remove('pending');
  el.classList.add('typing');
  for (let i = 1; i <= text.length && !run.skipped; i++) {
    el.textContent = text.slice(0, i);
    await sleep(SPEED);
  }
  el.textContent = text;
  el.classList.remove('typing');
}

// Types every [data-type] element inside root, in page order.
// Consecutive elements marked class="par" type at the same time.
// Elements with a data-track name form their own line of typing: each track
// types one element after another, and all tracks start together.
async function runTyping(root = document) {
  const run = { skipped: false };
  runs.add(run);
  const els = [...root.querySelectorAll('[data-type]')];
  const tracks = {};
  els.forEach(e => (tracks[e.dataset.track || 'main'] ||= []).push(e));
  await Promise.all(Object.values(tracks).map(async list => {
    for (let i = 0; i < list.length && !run.skipped; ) {
      const group = [list[i]];
      while (list[i].classList.contains('par') && list[i + 1] && list[i + 1].classList.contains('par')) {
        group.push(list[++i]);
      }
      i++;
      await Promise.all(group.map(el => typeEl(el, run)));
    }
  }));
  els.forEach(e => { e.textContent = e.dataset.type; e.classList.remove('pending', 'typing'); });
  runs.delete(run);
}

// Book details type out while the book is hovered, and clear when the mouse leaves.
async function showDetails(box) {
  const token = box._token = (box._token || 0) + 1;
  await Promise.all([...box.children].map(async el => {
    const text = el.dataset.full;
    el.textContent = '';
    for (let i = 1; i <= text.length && box._token === token; i++) {
      el.textContent = text.slice(0, i);
      await sleep(HOVER_SPEED);
    }
  }));
}
function hideDetails(box) {
  box._token = (box._token || 0) + 1;
  [...box.children].forEach(el => { el.textContent = ''; });
}

// ---------- books ----------

const coverUrl = isbn => `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
const hue = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };

// A book cover: the real photo if we can find it, otherwise a colored block with the title.
function coverEl(b) {
  const d = div('cover');
  d.style.background = `hsl(${hue(b.title)} 30% 38%)`;
  d.textContent = b.title;
  if (b.isbn) {
    const img = document.createElement('img');
    img.alt = `Cover of ${b.title}`;
    img.loading = 'lazy';
    img.onerror = () => img.remove();
    img.onload = () => { d.firstChild.textContent = ''; };
    img.src = coverUrl(b.isbn);
    d.append(img);
  }
  return d;
}

// Fills one shelf section: heading, subtitle and the grid of covers.
function buildShelf(shelf, books) {
  const root = document.querySelector(`#${shelf.id} .wrap`);
  const mk = (cls, text) => {
    const d = div(`${cls} pending`);
    d.dataset.type = text;
    return d;
  };
  const back = document.createElement('button');
  back.className = 'back par pending';
  back.dataset.type = '← Home';
  back.addEventListener('click', () => setView('home'));
  const heading = mk('line title par', shelf.heading);
  root.append(back, heading);

  const shown = books.filter(b => shelf.statuses.includes(b.status));
  if (!shown.length) root.append(mk('line', 'Nothing here yet.'));
  const grid = div('grid');
  shown.forEach(b => {
    const card = div('book');
    const stars = b.rating ? '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) : '';
    const status = b.status === 'reading' ? 'Reading now' : b.status === 'to-read' ? 'Up next' : '';
    const lines = [['t', b.title], ['a', b.author]];
    if (stars || status) lines.push(['s', stars || status]);
    if (b.note) lines.push(['n', b.note]);
    const details = div('details');
    lines.forEach(([cls, text]) => {
      const d = div(cls);
      d.dataset.full = text;
      details.append(d);
    });
    card.tabIndex = 0;
    ['mouseenter', 'focus'].forEach(ev => card.addEventListener(ev, () => showDetails(details)));
    ['mouseleave', 'blur'].forEach(ev => card.addEventListener(ev, () => hideDetails(details)));
    card.append(coverEl(b), details);
    grid.append(card);
  });
  root.append(grid);
  return shown.length;
}

// ---------- moving between the three places ----------

// Nothing scrolls: the intro lifts away and the shelf rises into its place.
const typed = new Set();
function setView(view, push = true) {
  const panel = document.getElementById(view);
  if (!panel) return;
  document.body.dataset.view = view;
  if (push) history.pushState(null, '', view === 'home' ? location.pathname : '#' + view);
  panel.scrollTop = 0;
  if (!typed.has(view)) { typed.add(view); runTyping(panel); }
}

// ---------- start ----------

(async function main() {
  let books = [];
  try { books = (await (await fetch('books.json')).json()).books; } catch (e) {}

  SHELVES.forEach(shelf => {
    const n = buildShelf(shelf, books);
    document.querySelector(`[data-count="${shelf.id}"]`).dataset.type = `${n} book${n === 1 ? '' : 's'}`;
  });

  document.querySelectorAll('[data-view]:not(body)').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    setView(el.dataset.view);
  }));
  addEventListener('popstate', () => setView(location.hash.slice(1) || 'home', false));

  setView(location.hash.slice(1) || 'home', false);
})();
