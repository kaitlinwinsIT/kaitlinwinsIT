const moods = [
  { label: 'Very sad', emoji: '😢', value: 1 },
  { label: 'Sad', emoji: '🙁', value: 2 },
  { label: 'Neutral', emoji: '😐', value: 3 },
  { label: 'Happy', emoji: '🙂', value: 4 },
  { label: 'Very happy', emoji: '😄', value: 5 }
];

let selectedMood = null;
const selector = document.getElementById('mood-selector');
const saveBtn = document.getElementById('save-btn');
const graph = document.getElementById('mood-graph');

// Setup mood buttons
moods.forEach(m => {
  const btn = document.createElement('button');
  btn.textContent = m.emoji;
  btn.setAttribute('role', 'radio');
  btn.setAttribute('aria-label', m.label);
  btn.addEventListener('click', () => {
    document.querySelectorAll('#mood-selector button').forEach(b => {
      b.classList.remove('selected');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('selected');
    btn.setAttribute('aria-pressed', 'true');
    selectedMood = m;
  });
  selector.appendChild(btn);
});

const keyPromise = window.crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode('gentle-secret-key-123'),
  { name: 'AES-GCM' },
  false,
  ['encrypt', 'decrypt']
);

async function encrypt(text) {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await keyPromise;
  const encoded = new TextEncoder().encode(text);
  const cipher = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const buff = new Uint8Array(cipher);
  const merged = new Uint8Array(iv.length + buff.length);
  merged.set(iv);
  merged.set(buff, iv.length);
  return btoa(String.fromCharCode(...merged));
}

async function decrypt(base64) {
  const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const iv = data.slice(0, 12);
  const enc = data.slice(12);
  const key = await keyPromise;
  const decrypted = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, enc);
  return new TextDecoder().decode(decrypted);
}

saveBtn.addEventListener('click', async () => {
  if (!selectedMood) return;
  const date = new Date().toISOString().slice(0, 10);
  const entry = { date, value: selectedMood.value };
  const encrypted = await encrypt(JSON.stringify(entry));
  localStorage.setItem(date, encrypted);
  renderGraph();
});

async function renderGraph() {
  graph.innerHTML = '';
  const today = new Date();
  const width = 280;
  const height = 100;
  const barWidth = width / 7;

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    const stored = localStorage.getItem(key);
    let moodValue = 0;

    if (stored) {
      try {
        const dec = await decrypt(stored);
        moodValue = JSON.parse(dec).value;
      } catch (e) {
        moodValue = 0;
      }
    }

    const x = (6 - i) * barWidth;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('width', barWidth - 4);
    rect.setAttribute('y', height - moodValue * 18);
    rect.setAttribute('height', moodValue * 18);
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${key}: ${moodValue ? moods[moodValue - 1].label : 'No entry'}`;
    rect.appendChild(title);
    graph.appendChild(rect);
  }
}

renderGraph();
