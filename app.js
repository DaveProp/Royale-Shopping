import { firebaseConfig } from './firebase-config.js';

const UNIT = 3500;
const WAVE = 'https://pay.wave.com/m/M_ci_fAtDWzspJqhS/c/ci/';
const WA_NUMBER = '2250711482324';
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/* ---------- Mode hors ligne et installation ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () {});
  });
}

let deferred = null;
const installBtn = document.getElementById('install');
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  deferred = e;
  installBtn.style.display = 'inline-block';
});
installBtn.addEventListener('click', function () {
  if (!deferred) return;
  deferred.prompt();
  deferred.userChoice.then(function () {
    deferred = null;
    installBtn.style.display = 'none';
  });
});
window.addEventListener('appinstalled', function () {
  installBtn.style.display = 'none';
});
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
if (isIOS && !standalone) {
  document.getElementById('ioshint').hidden = false;
}

/* ---------- Commande ---------- */
const dlg = document.getElementById('orderDialog');
const form = document.getElementById('orderForm');
const stepForm = document.getElementById('stepForm');
const stepPay = document.getElementById('stepPay');
const odItem = document.getElementById('odItem');
const odTotal = document.getElementById('odTotal');
const odQty = document.getElementById('odQty');
const odErr = document.getElementById('odErr');
const odSubmit = document.getElementById('odSubmit');

let couleur = '';
let qty = 1;

function updateTotal() {
  odQty.textContent = qty;
  odTotal.textContent = fmt(qty * UNIT) + ' FCFA';
}

function showErr(msg, field) {
  odErr.textContent = msg;
  odErr.hidden = false;
  if (field) field.focus();
}

function hideErr() {
  odErr.hidden = true;
  odErr.textContent = '';
}

function configured() {
  return firebaseConfig.apiKey && firebaseConfig.apiKey.indexOf('VOTRE') !== 0;
}

function openDialog(color) {
  couleur = color;
  qty = 1;
  form.reset();
  hideErr();
  odItem.textContent = 'T-shirt ACENA 2026 · ' + color + ' · ' + fmt(UNIT) + ' FCFA';
  updateTotal();
  stepForm.hidden = false;
  stepPay.hidden = true;
  odSubmit.disabled = false;
  if (typeof dlg.showModal === 'function') dlg.showModal();
  else dlg.setAttribute('open', '');
}

function closeDialog() {
  if (typeof dlg.close === 'function') dlg.close();
  else dlg.removeAttribute('open');
}

document.querySelectorAll('[data-order]').forEach(function (btn) {
  btn.addEventListener('click', function () {
    openDialog(btn.getAttribute('data-order'));
  });
});

document.querySelectorAll('#orderDialog .qty button').forEach(function (b) {
  b.addEventListener('click', function () {
    qty = Math.min(20, Math.max(1, qty + Number(b.getAttribute('data-d'))));
    updateTotal();
  });
});

document.getElementById('odClose').addEventListener('click', closeDialog);
document.getElementById('odDone').addEventListener('click', closeDialog);

let dbPromise = null;
function getDb() {
  if (!dbPromise) {
    dbPromise = Promise.all([
      import(FB + 'firebase-app.js'),
      import(FB + 'firebase-firestore.js')
    ]).then(function (mods) {
      const app = mods[0].initializeApp(firebaseConfig);
      return { db: mods[1].getFirestore(app), fs: mods[1] };
    }).catch(function (err) {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  hideErr();

  const nom = form.nom.value.trim();
  const telephone = form.telephone.value.replace(/[\s.\-()]/g, '');
  const email = form.email.value.trim();
  const taille = form.taille.value;

  if (nom.length < 2) return showErr('Indiquez votre nom complet.', form.nom);
  if (!/^\+?[0-9]{8,15}$/.test(telephone)) return showErr('Indiquez un numéro de téléphone valide.', form.telephone);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showErr('Cet email semble incorrect. Vous pouvez aussi le laisser vide.', form.email);
  }
  if (!taille) return showErr('Choisissez une taille.', form.taille);
  if (!configured()) {
    return showErr("La boutique n'est pas encore prête. Contactez-nous sur WhatsApp au 07 11 48 23 24.");
  }

  odSubmit.disabled = true;
  odSubmit.textContent = 'Envoi en cours...';
  const total = qty * UNIT;

  try {
    const ctx = await getDb();
    const data = {
      nom: nom,
      telephone: telephone,
      couleur: couleur,
      taille: taille,
      quantite: qty,
      montant: total,
      statut: 'en_attente',
      createdAt: ctx.fs.serverTimestamp()
    };
    if (email) data.email = email;
    await ctx.fs.addDoc(ctx.fs.collection(ctx.db, 'commandes'), data);
  } catch (err) {
    console.error(err);
    odSubmit.disabled = false;
    odSubmit.textContent = 'Valider ma commande';
    return showErr("Impossible d'enregistrer la commande. Vérifiez votre connexion et réessayez.");
  }

  odSubmit.textContent = 'Valider ma commande';
  document.getElementById('payName').textContent = nom;
  document.getElementById('payTotal').textContent = fmt(total) + ' FCFA';
  const wave = document.getElementById('payWave');
  wave.href = WAVE + '?amount=' + total;
  wave.textContent = 'Payer ' + fmt(total) + ' FCFA avec Wave';
  const msg = "Bonjour, j'ai payé ma commande Royale Shopping.\n" +
    'Nom : ' + nom + '\n' +
    'T-shirt ACENA 2026 : ' + couleur + '\n' +
    'Taille : ' + taille + '\n' +
    'Quantité : ' + qty + '\n' +
    'Montant : ' + fmt(total) + ' FCFA';
  document.getElementById('payWa').href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msg);
  stepForm.hidden = true;
  stepPay.hidden = false;
});
