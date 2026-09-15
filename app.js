
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

/* ---- GIFT PICKER ---- */

// Payment handles. Update these to the real ones before launch.
const PAYPAL_ME = 'https://paypal.me/YOUR-PAYPAL-HANDLE';
const MONZO_ME  = 'https://monzo.me/robertjackbailey?h=0taTZk&account_type=joint';

// Airtable: one row per gift claimed, written when a payment button is pressed.
// The table needs text fields Name, Gift and Method.
const AIRTABLE_TOKEN = 'patXdBwjorqFnrFOA.16ecf57ae58f4d0fbc08d1f8ec6b7a81f7d952f8d3400f46be788c93209291cc';
const AIRTABLE_BASE  = 'appkOCg0RLlb00Xfj';
const AIRTABLE_TABLE = 'Gifts';

const GIFTS = [
  { item: 'Lost Luggage',                         emoji: '🧳', location: 'Carousel 4, Bangkok',      blurb: 'A whole new wardrobe' },
  { item: 'Bangkok Street Food Gamble',           emoji: '🍜', location: 'Khao San Road, Bangkok',   blurb: 'An emergency crate of Imodium' },
  { item: 'Car v Kangaroo',                       emoji: '🦘', location: 'Stuart Highway, Australia', blurb: 'A replacement rental and the excess to match' },
  { item: 'Sunburn on Day One',                   emoji: '☀️', location: 'Koh Lanta, Thailand',      blurb: 'A fortnight of aloe vera and shade hats' },
  { item: 'Phone Dropped off the Longtail Boat',  emoji: '📱', location: 'Railay Beach, Krabi',      blurb: 'A full holiday replacement' }
];

let selectedGift = null;

function buildGiftCards() {
  const wrap = document.getElementById('gift-cards');
  if (!wrap) return;

  wrap.innerHTML = GIFTS.map((gift, i) =>
    '<div class="postcard" id="pc-' + i + '">' +
      '<div class="postcard-inner">' +
        '<button class="postcard-face pc-front" type="button" onclick="flipCard(' + i + ')">' +
          '<span class="pc-stamp" aria-hidden="true">' + gift.emoji + '</span>' +
          '<span class="pc-title">' + gift.item + '</span>' +
          '<span class="pc-location">' + gift.location + '</span>' +
          '<span class="pc-rule"></span>' +
          '<span class="pc-cta">Tap to see the damage</span>' +
        '</button>' +
        '<div class="postcard-face pc-back" inert>' +
          '<span class="pc-postmark" aria-hidden="true">' + gift.emoji + '</span>' +
          '<p class="pc-blurb">' + gift.blurb + '</p>' +
          '<div class="pc-actions">' +
            '<button class="pc-pick" type="button" id="pc-pick-' + i + '" onclick="chooseGift(' + i + ')">Choose this</button>' +
            '<button class="pc-return" type="button" onclick="flipCard(' + i + ')">Flip back</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');
}

// One card face at a time is reachable: `inert` keeps the hidden side out of
// the tab order, which backface-visibility alone does not do.
function setCardFlipped(card, flipped) {
  card.classList.toggle('flipped', flipped);
  card.querySelector('.pc-front').toggleAttribute('inert', flipped);
  card.querySelector('.pc-back').toggleAttribute('inert', !flipped);
}

function flipCard(i) {
  const card = document.getElementById('pc-' + i);
  const flipping = !card.classList.contains('flipped');

  // Only one card stays face-up, so the grid never turns into a wall of text.
  document.querySelectorAll('.postcard.flipped').forEach(c => setCardFlipped(c, false));
  setCardFlipped(card, flipping);

  if (flipping) {
    card.querySelector('.pc-pick').focus({ preventScroll: true });
  } else {
    card.querySelector('.pc-front').focus({ preventScroll: true });
  }
}

function chooseGift(i) {
  selectedGift = GIFTS[i];

  document.querySelectorAll('.postcard').forEach((c, n) => {
    const chosen = n === i;
    c.classList.toggle('selected', chosen);
    const pick = document.getElementById('pc-pick-' + n);
    if (pick) pick.textContent = chosen ? 'Chosen' : 'Choose this';
  });

  const chosenEl = document.getElementById('gift-chosen');
  chosenEl.classList.remove('empty');
  chosenEl.textContent = selectedGift.emoji + ' ' + selectedGift.item;
  document.getElementById('gift-step-1').classList.add('done');

  refreshGiftState();
  if (!document.getElementById('gift-name').value.trim()) {
    document.getElementById('gift-name').focus({ preventScroll: true });
  }
}

function refreshGiftState() {
  const name = document.getElementById('gift-name').value.trim();
  const ready = !!selectedGift && name.length > 0;

  document.getElementById('gift-step-2').classList.toggle('done', name.length > 0);
  document.getElementById('pay-paypal').disabled = !ready;
  document.getElementById('pay-monzo').disabled = !ready;

  const hint = document.getElementById('gift-pay-hint');
  hint.classList.toggle('done', ready);
  if (ready) {
    hint.textContent = 'All set. Send whatever feels right — the amount is entirely up to you.';
  } else if (!selectedGift) {
    hint.textContent = 'Choose a gift and add your name to unlock the payment buttons.';
  } else {
    hint.textContent = 'Add your name to unlock the payment buttons.';
  }
}

async function logGift(name, gift, method) {
  try {
    await fetch('https://api.airtable.com/v0/' + AIRTABLE_BASE + '/' + encodeURIComponent(AIRTABLE_TABLE), {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + AIRTABLE_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Name': name,
          'Gift': gift.item,
          'Method': method === 'monzo' ? 'Monzo' : 'PayPal'
        }
      })
    });
  } catch (e) {
    // A failed log should never stand between a guest and the payment app.
    console.error('Airtable error:', e);
  }
}

function payGift(method) {
  const name = document.getElementById('gift-name').value.trim();
  if (!selectedGift || !name) return;

  // Open first: browsers only allow this while the click is still being handled.
  window.open(method === 'monzo' ? MONZO_ME : PAYPAL_ME, '_blank', 'noopener');
  logGift(name, selectedGift, method);

  const hint = document.getElementById('gift-pay-hint');
  hint.classList.add('done');
  hint.textContent = 'Thank you, ' + name.split(' ')[0] + '. ' + selectedGift.item + ' is officially yours.';
}

if (document.getElementById('gift-cards')) {
  buildGiftCards();
  document.getElementById('gift-name').addEventListener('input', refreshGiftState);
  refreshGiftState();
}
