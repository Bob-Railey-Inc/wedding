
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
const MONZO_ME  = 'https://monzo.me/YOUR-MONZO-HANDLE';

// Airtable: one row per gift claimed, written when a payment button is pressed.
// The table needs text fields Name, Gift, Method and a number field Amount.
const AIRTABLE_TOKEN = 'YOUR_AIRTABLE_PAT';
const AIRTABLE_BASE  = 'appkOCg0RLlb00Xfj';
const AIRTABLE_TABLE = 'Gifts';

const GIFTS = [
  { item: 'One Chang beer, drunk at sunset',        amount: 4,  blurb: 'Warm within ten minutes. Worth it anyway.' },
  { item: 'Pad thai from a plastic stool',          amount: 3,  blurb: 'The best meal of the entire trip, obviously.' },
  { item: 'A longtail boat to a beach we saw once', amount: 22, blurb: 'Captain optional. Life jackets aspirational.' },
  { item: 'One night in a beach hut',               amount: 45, blurb: 'Sea view. Also a gecko view.' },
  { item: 'Two snorkels and one shared panic',      amount: 15, blurb: 'Rob will see a fish and leave the water.' },
  { item: 'Emergency factor-50 and aloe vera',      amount: 9,  blurb: 'For the person who insisted they never burn.' },
  { item: 'A Thai massage and its consequences',    amount: 20, blurb: 'You will hear a noise. It was a rib.' },
  { item: 'The 6am airport pint',                   amount: 11, blurb: 'A sacred tradition. Cost per pint: heartbreaking.' },
  { item: 'A properly serious Melbourne coffee',    amount: 6,  blurb: 'Hanna will have opinions about the crema.' },
  { item: 'A surf lesson, one wave, mostly sand',   amount: 30, blurb: 'Standing up is not included in the price.' },
  { item: 'Snacks to bribe a kangaroo',             amount: 12, blurb: 'For a photo. The kangaroo sets the terms.' },
  { item: 'The obligatory Opera House selfie',      amount: 25, blurb: 'Cost is entirely the ferry there and back.' }
];

let selectedGift = null;

function buildGiftAccordion() {
  const wrap = document.getElementById('gift-accordion');
  if (!wrap) return;

  wrap.innerHTML = GIFTS.map((gift, i) =>
    '<div class="gift-row" id="gift-row-' + i + '">' +
      '<button class="gift-row-head" type="button" aria-expanded="false" aria-controls="gift-panel-' + i + '" onclick="toggleGift(' + i + ')">' +
        '<span class="gift-row-name">' + gift.item + '</span>' +
        '<span class="gift-row-price">£' + gift.amount + '</span>' +
        '<span class="gift-row-chevron"></span>' +
      '</button>' +
      '<div class="gift-row-panel" id="gift-panel-' + i + '" role="region">' +
        '<div class="gift-row-panel-inner">' +
          '<div class="gift-row-body">' +
            '<p class="gift-row-blurb">' + gift.blurb + '</p>' +
            '<button class="gift-row-pick" type="button" id="gift-pick-' + i + '" onclick="chooseGift(' + i + ')">Choose this</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>'
  ).join('');
}

// One row open at a time, so the list never turns into a wall of text.
function toggleGift(i) {
  const row = document.getElementById('gift-row-' + i);
  const opening = !row.classList.contains('open');
  document.querySelectorAll('.gift-row.open').forEach(r => {
    r.classList.remove('open');
    r.querySelector('.gift-row-head').setAttribute('aria-expanded', 'false');
  });
  if (opening) {
    row.classList.add('open');
    row.querySelector('.gift-row-head').setAttribute('aria-expanded', 'true');
  }
}

function chooseGift(i) {
  selectedGift = GIFTS[i];

  document.querySelectorAll('.gift-row').forEach((r, n) => {
    const chosen = n === i;
    r.classList.toggle('selected', chosen);
    const pick = document.getElementById('gift-pick-' + n);
    if (pick) pick.textContent = chosen ? 'Chosen' : 'Choose this';
  });

  const chosenEl = document.getElementById('gift-chosen');
  chosenEl.classList.remove('empty');
  chosenEl.innerHTML = selectedGift.item + '<span class="gift-step-amount">£' + selectedGift.amount + '</span>';
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
    hint.textContent = 'All set — pick how you would like to send £' + selectedGift.amount + '.';
  } else if (!selectedGift) {
    hint.textContent = 'Choose a gift and add your name to unlock the payment buttons.';
  } else {
    hint.textContent = 'Add your name to unlock the payment buttons.';
  }
}

function paymentLink(method, gift, name) {
  const note = encodeURIComponent(gift.item + ' — ' + name);
  return method === 'monzo'
    ? MONZO_ME + '/' + gift.amount + '?d=' + note
    : PAYPAL_ME + '/' + gift.amount + 'GBP';
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
          'Amount': gift.amount,
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
  window.open(paymentLink(method, selectedGift, name), '_blank', 'noopener');
  logGift(name, selectedGift, method);

  const hint = document.getElementById('gift-pay-hint');
  hint.classList.add('done');
  hint.textContent = 'Thank you, ' + name.split(' ')[0] + '. ' + selectedGift.item + ' is officially yours.';
}

if (document.getElementById('gift-accordion')) {
  buildGiftAccordion();
  document.getElementById('gift-name').addEventListener('input', refreshGiftState);
  refreshGiftState();
}
