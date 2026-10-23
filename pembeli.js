import { db } from './firebase-init.js';
import {
  collection, onSnapshot, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const menuList = document.getElementById('menu-list');
const cartList = document.getElementById('cart-list');
const btnPesan = document.getElementById('btn-pesan');

let menuData = [];
let cart = {}; // { menuId: { nama, harga, qty } }

// --- Tampilkan menu real-time ---
onSnapshot(collection(db, 'menu'), (snap) => {
  menuData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderMenu();
});

function renderMenu() {
  if (menuData.length === 0) {
    menuList.innerHTML = '<div class="empty">Belum ada menu. Pemilik toko belum menambahkan menu.</div>';
    return;
  }
  menuList.innerHTML = menuData.map(m => `
    <div class="card">
      <h3>${m.nama}</h3>
      <div class="harga">Rp ${(m.harga || 0).toLocaleString('id-ID')}</div>
      <div class="row" style="margin-top:8px;">
        <button data-id="${m.id}" class="btn-tambah">+ Tambah</button>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.btn-tambah').forEach(btn => {
    btn.onclick = () => tambahKeCart(btn.dataset.id);
  });
}

function tambahKeCart(menuId) {
  const m = menuData.find(x => x.id === menuId);
  if (!m) return;
  if (!cart[menuId]) cart[menuId] = { ...m, qty: 0 };
  cart[menuId].qty++;
  renderCart();
}

function renderCart() {
  const items = Object.values(cart).filter(i => i.qty > 0);
  if (items.length === 0) {
    cartList.innerHTML = '<div class="empty">Belum ada pesanan.</div>';
    btnPesan.disabled = true;
    btnPesan.textContent = 'Pesan Sekarang (Rp 0)';
    return;
  }
  let total = 0;
  cartList.innerHTML = items.map(i => {
    const sub = i.harga * i.qty;
    total += sub;
    return `
      <div class="card">
        <div class="row">
          <div style="flex:2;">
            <h3>${i.nama}</h3>
            <div style="font-size:0.85rem;color:#666;">Rp ${i.harga.toLocaleString('id-ID')} × ${i.qty}</div>
          </div>
          <div style="text-align:right;">
            <div class="harga">Rp ${sub.toLocaleString('id-ID')}</div>
            <div style="margin-top:6px;">
              <button data-id="${i.id}" class="btn-minus" style="padding:4px 10px;">−</button>
              <button data-id="${i.id}" class="btn-plus" style="padding:4px 10px;">+</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  cartList.querySelectorAll('.btn-plus').forEach(b => b.onclick = () => {
    cart[b.dataset.id].qty++; renderCart();
  });
  cartList.querySelectorAll('.btn-minus').forEach(b => b.onclick = () => {
    cart[b.dataset.id].qty--;
    if (cart[b.dataset.id].qty <= 0) delete cart[b.dataset.id];
    renderCart();
  });

  btnPesan.disabled = false;
  btnPesan.textContent = `Pesan Sekarang (Rp ${total.toLocaleString('id-ID')})`;
}

// --- Kirim pesanan ---
btnPesan.onclick = async () => {
  const items = Object.values(cart).filter(i => i.qty > 0).map(i => ({
    nama: i.nama, harga: i.harga, qty: i.qty
  }));
  if (items.length === 0) return;

  const namaPemesan = prompt('Nama kamu:');
  if (!namaPemesan) return;

  const total = items.reduce((s, i) => s + i.harga * i.qty, 0);

  btnPesan.disabled = true;
  btnPesan.textContent = 'Mengirim...';
  try {
    await addDoc(collection(db, 'pesanan'), {
      namaPemesan,
      items,
      total,
      status: 'baru',
      dibuat: serverTimestamp()
    });
    cart = {};
    renderCart();
    alert('Pesanan terkirim! Pemilik toko akan segera memproses.');
  } catch (e) {
    alert('Gagal mengirim: ' + e.message);
    btnPesan.disabled = false;
  }
};