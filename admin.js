import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const $ = (id) => document.getElementById(id);
const loginBox = $('loginBox');
const loginForm = $('loginForm');
const loginErr = $('loginErr');
const panel = $('panel');
const panelErr = $('panelErr');
const list = $('list');
const empty = $('empty');
const search = $('search');

const STATUTS = [
  ['en_attente', 'En attente de paiement'],
  ['paye', 'Payé'],
  ['livre', 'Livré'],
  ['annule', 'Annulé']
];

function fmt(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined && text !== null) e.textContent = text;
  return e;
}

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.indexOf('VOTRE') === 0) {
  loginErr.textContent = "Firebase n'est pas encore configuré. Remplissez firebase-config.js (voir LISEZ-MOI.txt).";
  loginErr.hidden = false;
  loginForm.querySelector('button').disabled = true;
} else {
  start();
}

function start() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  let orders = [];
  let unsub = null;

  loginForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    loginErr.hidden = true;
    const btn = loginForm.querySelector('button');
    btn.disabled = true;
    try {
      await signInWithEmailAndPassword(auth, loginForm.email.value.trim(), loginForm.password.value);
    } catch (err) {
      loginErr.textContent = 'Email ou mot de passe incorrect.';
      loginErr.hidden = false;
    }
    btn.disabled = false;
  });

  $('logoutBtn').addEventListener('click', function () {
    signOut(auth);
  });

  onAuthStateChanged(auth, function (user) {
    if (unsub) { unsub(); unsub = null; }
    orders = [];
    $('logoutBtn').hidden = !user;
    if (!user) {
      panel.hidden = true;
      loginBox.hidden = false;
      return;
    }
    loginBox.hidden = true;
    panel.hidden = false;
    panelErr.hidden = true;
    $('who').textContent = user.email;
    const q = query(collection(db, 'commandes'), orderBy('createdAt', 'desc'));
    unsub = onSnapshot(q, function (snap) {
      orders = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
      render();
    }, function (err) {
      panelErr.textContent = err && err.code === 'permission-denied'
        ? "Ce compte n'est pas autorisé à voir les commandes."
        : 'Impossible de charger les commandes.';
      panelErr.hidden = false;
    });
  });

  search.addEventListener('input', render);

  $('exportBtn').addEventListener('click', function () {
    const head = ['Date', 'Nom', 'Téléphone', 'Email', 'Produit', 'Couleur', 'Taille', 'Quantité', 'Montant FCFA', 'Statut'];
    const lines = [head].concat(orders.map(function (o) {
      return [dateStr(o), o.nom, o.telephone, o.email || '', o.produit || 'T-shirt', o.couleur, o.taille, o.quantite, o.montant, statutLabel(o.statut)];
    }));
    const csv = lines.map(function (row) {
      return row.map(function (v, i) {
        let s = String(v === undefined || v === null ? '' : v);
        if (i !== 2 && /^[=+\-@]/.test(s)) s = "'" + s;
        return '"' + s.replace(/"/g, '""') + '"';
      }).join(';');
    }).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'commandes-royale-shopping.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
  });

  function statutLabel(s) {
    const f = STATUTS.find(function (x) { return x[0] === s; });
    return f ? f[1] : s;
  }

  function dateStr(o) {
    if (o.createdAt && typeof o.createdAt.toDate === 'function') {
      return o.createdAt.toDate().toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
    }
    return '';
  }

  function waNumber(tel) {
    let t = String(tel || '').replace(/[^0-9+]/g, '');
    if (t.charAt(0) === '+') return t.slice(1);
    if (t.length === 10) return '225' + t;
    return t;
  }

  function card(o) {
    const c = el('article', 'order');
    const top = el('div', 'top');
    top.appendChild(el('h3', '', o.nom));
    top.appendChild(el('span', 'date', dateStr(o)));
    c.appendChild(top);

    const phone = el('a', 'phone', o.telephone);
    phone.href = 'tel:' + o.telephone;
    const wa = el('a', 'wa', 'WhatsApp');
    wa.href = 'https://wa.me/' + waNumber(o.telephone);
    wa.target = '_blank';
    wa.rel = 'noopener';
    const contact = el('div', 'contact');
    contact.appendChild(phone);
    contact.appendChild(wa);
    c.appendChild(contact);

    c.appendChild(el('div', 'mail', o.email ? o.email : 'Email non renseigné'));
    c.appendChild(el('div', 'item', (o.produit || 'T-shirt') + ' ' + o.couleur + ' · taille ' + o.taille + ' · quantité ' + o.quantite + ' · ' + fmt(o.montant) + ' FCFA'));

    const sel = el('select', 'statut');
    sel.setAttribute('aria-label', 'Statut de la commande de ' + o.nom);
    STATUTS.forEach(function (s) {
      const opt = el('option', '', s[1]);
      opt.value = s[0];
      if (s[0] === o.statut) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', function () {
      updateDoc(doc(db, 'commandes', o.id), { statut: sel.value }).catch(function () {
        panelErr.textContent = 'Le statut n\'a pas pu être modifié.';
        panelErr.hidden = false;
      });
    });
    c.appendChild(sel);
    return c;
  }

  function render() {
    const q = search.value.trim().toLowerCase();
    const rows = orders.filter(function (o) {
      return !q || (String(o.nom) + ' ' + String(o.telephone) + ' ' + String(o.email || '')).toLowerCase().indexOf(q) !== -1;
    });
    list.textContent = '';
    rows.forEach(function (o) { list.appendChild(card(o)); });
    empty.hidden = rows.length > 0;

    const paid = orders.filter(function (o) { return o.statut === 'paye' || o.statut === 'livre'; });
    $('statTotal').textContent = orders.length;
    $('statWait').textContent = orders.filter(function (o) { return o.statut === 'en_attente'; }).length;
    $('statPaid').textContent = paid.length;
    $('statSum').textContent = fmt(paid.reduce(function (s, o) { return s + (o.montant || 0); }, 0)) + ' FCFA';
  }
}
