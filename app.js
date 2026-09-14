
function enterSite() {
  const entrance = document.getElementById('entrance');
  const main = document.getElementById('main-site');
  document.body.classList.remove('entrance-open');
  
  entrance.classList.add('fade-out');
  
  setTimeout(() => {
    entrance.style.display = 'none';
    window.scrollTo(0, 0);
    main.classList.add('visible');
  }, 750);
}

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function smoothTo(id) {
  const el = document.getElementById(id);
  if (el) {
    setTimeout(() => { el.scrollIntoView({ behavior: 'smooth' }); }, 10);
  }
}
function toggleNav() { document.getElementById('nav-links').classList.toggle('open'); }
function closeNav() { document.getElementById('nav-links').classList.remove('open'); }

window.addEventListener('scroll', () => {
  document.getElementById('nav')?.classList.toggle('scrolled', window.scrollY > 80);
});

/* ---- GIFT ROULETTE ---- */
// Update this to your own PayPal.me handle. Amount is appended automatically.
const PAYPAL_ME = 'https://paypal.me/sambarker111';

const WHEEL_PRIZES = [
  { label: 'Chang beer',    item: 'One Chang beer, drunk at sunset',        amount: 4,  blurb: 'Warm within ten minutes. Worth it anyway.' },
  { label: 'Pad thai',      item: 'Pad thai from a plastic stool',          amount: 3,  blurb: 'The best meal of the entire trip, obviously.' },
  { label: 'Longtail boat', item: 'A longtail boat to a beach we saw once', amount: 22, blurb: 'Captain optional. Life jackets aspirational.' },
  { label: 'Beach hut',     item: 'One night in a beach hut',               amount: 45, blurb: 'Sea view. Also a gecko view.' },
  { label: 'Snorkels',      item: 'Two snorkels and one shared panic',      amount: 15, blurb: 'Rob will see a fish and leave the water.' },
  { label: 'Aloe vera',     item: 'Emergency factor-50 and aloe vera',      amount: 9,  blurb: 'For the person who insisted they never burn.' },
  { label: 'Thai massage',  item: 'A Thai massage and its consequences',    amount: 20, blurb: 'You will hear a noise. It was a rib.' },
  { label: 'Airport pint',  item: 'The 6am airport pint',                   amount: 11, blurb: 'A sacred tradition. Cost per pint: heartbreaking.' },
  { label: 'Flat white',    item: 'A properly serious Melbourne coffee',    amount: 6,  blurb: 'Hanna will have opinions about the crema.' },
  { label: 'Surf lesson',   item: 'A surf lesson, one wave, mostly sand',   amount: 30, blurb: 'Standing up is not included in the price.' },
  { label: 'Kangaroo',      item: 'Snacks to bribe a kangaroo',             amount: 12, blurb: 'For a photo. The kangaroo sets the terms.' },
  { label: 'Opera selfie',  item: 'The obligatory Opera House selfie',      amount: 25, blurb: 'Cost is entirely the ferry there and back.' }
];

const WHEEL_COLOURS = ['#f25c1e', '#ffc233', '#00a9a5', '#ff2e88', '#7fb03a'];
const WHEEL_TEXT    = ['#fff6e0', '#2f1b0e', '#fff6e0', '#fff6e0', '#2f1b0e'];

const POINTER_ANGLE = 0; // 3 o'clock
let wheelRotation = -Math.PI / 12;
let wheelSpinning = false;

function segColourIndex(i) {
  // Keep the first and last wedge from matching when the counts don't divide evenly.
  const n = WHEEL_COLOURS.length;
  let c = i % n;
  if (i === WHEEL_PRIZES.length - 1 && c === 0) c = n > 2 ? n - 2 : 1;
  return c;
}

// The face never changes, only its angle, so draw it once and re-stamp it.
let wheelFace = null;
function buildWheelFace(size) {
  const face = document.createElement('canvas');
  face.width = face.height = size;
  const ctx = face.getContext('2d');
  const r = size / 2;
  const n = WHEEL_PRIZES.length;
  const seg = (Math.PI * 2) / n;

  ctx.save();
  ctx.translate(r, r);

  for (let i = 0; i < n; i++) {
    const a0 = i * seg;
    const c = segColourIndex(i);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r - 4, a0, a0 + seg);
    ctx.closePath();
    ctx.fillStyle = WHEEL_COLOURS[c];
    ctx.fill();
    ctx.strokeStyle = '#fff6e0';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.save();
    ctx.rotate(a0 + seg / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = WHEEL_TEXT[c];
    // Only the outer half of the radius is ever on screen, so keep text inside it.
    const maxWidth = r * 0.62 - 46;
    let fontSize = 34;
    do {
      ctx.font = '600 ' + fontSize + 'px "DM Sans", sans-serif';
      fontSize -= 1;
    } while (ctx.measureText(WHEEL_PRIZES[i].label).width > maxWidth && fontSize > 16);
    ctx.fillText(WHEEL_PRIZES[i].label, r - 34, -14);
    ctx.font = '400 24px "Courier Prime", monospace';
    ctx.globalAlpha = 0.75;
    ctx.fillText('£' + WHEEL_PRIZES[i].amount, r - 34, 22);
    ctx.restore();
  }

  ctx.restore();

  // Hub: only its tip shows, at the point of the wedge, so keep it dark
  ctx.beginPath();
  ctx.arc(r, r, r * 0.16, 0, Math.PI * 2);
  ctx.fillStyle = '#2f1b0e';
  ctx.fill();

  // Outer rim, cream so the wheel reads against the dark slot behind it
  ctx.beginPath();
  ctx.arc(r, r, r - 5, 0, Math.PI * 2);
  ctx.strokeStyle = '#fff6e0';
  ctx.lineWidth = 8;
  ctx.stroke();

  return face;
}

// Motion blur: stamp the face across the angle it swept since the last frame and
// average the stamps, so the smear follows the rotation instead of going soft all over.
function drawWheel(swept = 0) {
  const canvas = document.getElementById('wheel');
  if (!canvas) return;
  const size = canvas.width;
  const r = size / 2;
  if (!wheelFace) wheelFace = buildWheelFace(size);

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);

  const stamps = Math.min(24, Math.max(1, Math.round(Math.abs(swept) / 0.012)));
  for (let i = 0; i < stamps; i++) {
    ctx.save();
    ctx.globalAlpha = 1 / (i + 1); // running mean, so every stamp weighs the same
    ctx.translate(r, r);
    ctx.rotate(wheelRotation - swept * (i / stamps));
    ctx.drawImage(wheelFace, -r, -r);
    ctx.restore();
  }
}

let tickAudio = null;
function tick() {
  try {
    if (!tickAudio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      tickAudio = new AC();
    }
    const osc = tickAudio.createOscillator();
    const gain = tickAudio.createGain();
    osc.type = 'square';
    osc.frequency.value = 1100;
    gain.gain.setValueAtTime(0.05, tickAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, tickAudio.currentTime + 0.045);
    osc.connect(gain).connect(tickAudio.destination);
    osc.start();
    osc.stop(tickAudio.currentTime + 0.05);
  } catch (e) { /* silence is fine */ }
}

function spinWheel() {
  if (wheelSpinning) return;
  wheelSpinning = true;

  const btn = document.getElementById('spin-btn');
  const out = document.getElementById('roulette-result');
  btn.disabled = true;
  out.innerHTML = '';

  const n = WHEEL_PRIZES.length;
  const seg = (Math.PI * 2) / n;
  const winner = Math.floor(Math.random() * n);

  // Land the middle of the winning wedge on the pointer.
  const target = POINTER_ANGLE - winner * seg - seg / 2;
  const spins = 5 + Math.floor(Math.random() * 3);
  const start = wheelRotation;
  const twoPi = Math.PI * 2;
  let delta = ((target - start) % twoPi + twoPi) % twoPi + spins * twoPi;

  const duration = 9200;
  const startTime = performance.now();
  let lastSeg = -1;

  function frame(now) {
    const t = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 4);
    const previous = wheelRotation;
    wheelRotation = start + delta * eased;
    drawWheel(wheelRotation - previous);

    const current = Math.floor(((POINTER_ANGLE - wheelRotation) % twoPi + twoPi) % twoPi / seg);
    if (current !== lastSeg) { if (lastSeg !== -1) tick(); lastSeg = current; }

    if (t < 1) {
      requestAnimationFrame(frame);
    } else {
      wheelRotation = ((target % twoPi) + twoPi) % twoPi;
      drawWheel();
      wheelSpinning = false;
      btn.disabled = false;
      btn.textContent = 'Again';
      showPrize(WHEEL_PRIZES[winner]);
    }
  }
  requestAnimationFrame(frame);
}

function showPrize(prize) {
  const out = document.getElementById('roulette-result');
  out.innerHTML =
    '<div class="result-card">' +
      '<div class="result-eyebrow">The wheel has spoken</div>' +
      '<div class="result-item">' + prize.item + '</div>' +
      '<div class="result-price">£' + prize.amount + '</div>' +
      '<div class="result-blurb">' + prize.blurb + '</div>' +
      '<div class="result-actions">' +
        '<a class="gift-btn" href="' + PAYPAL_ME + '" target="_blank" rel="noopener">Pay on PayPal</a>' +
        '<button class="respin-btn" onclick="spinWheel()">Reject fate</button>' +
      '</div>' +
    '</div>';
}

if (document.getElementById('wheel')) {
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { wheelFace = null; drawWheel(); });
  }
  drawWheel();
}
