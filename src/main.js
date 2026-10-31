import '@fontsource/montserrat/vietnamese-400.css';
import '@fontsource/montserrat/vietnamese-500.css';
import '@fontsource/montserrat/vietnamese-600.css';
import '@fontsource/montserrat/vietnamese-700.css';
import '@fontsource/montserrat/vietnamese-800.css';
import '@fontsource/montserrat/latin-400.css';
import '@fontsource/montserrat/latin-500.css';
import '@fontsource/montserrat/latin-600.css';
import '@fontsource/montserrat/latin-700.css';
import '@fontsource/montserrat/latin-800.css';
import './style.css';
import { normalizePhone } from './phone.js';
import { merchImages, maxMerchCount, campaignId } from './catalog.js';
import { sortMerch } from './sort.js';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} };
let phone = read('tuctac-phone', '');
const demoVotesKey = `tuctac-demo-votes-${campaignId}`;
let demoVotes = read(demoVotesKey, {});
let counts = [], voted = [], demo = import.meta.env.DEV, ready = false, connecting = true, pending = null, busy = false;
let photos = [...merchImages];
let sortOrder = 'default';
let photo = '';
let logo = read('tuctac-logo-image', '') || '/logo.jpeg';
const originalHtml = '<!doctype html>' + document.documentElement.outerHTML;
const app = document.querySelector('#app');
app.innerHTML = `
<main>
<section class="hero"><div class="hero-logo" id="hero-logo"></div><h1>BÌNH CHỌN MERCH COMEBACK</h1></section>
<section id="ranking" class="ranking section"><h2>BẢNG XẾP HẠNG</h2><p id="voting-status" role="status" hidden>Chưa kết nối được hệ thống bình chọn. Chạm “Thử lại bình chọn” để kết nối lại. Phiếu chỉ được ghi nhận khi hệ thống xác nhận thành công.</p><div id="podium" class="podium"></div></section>
<section id="collection" class="collection section"><div class="collection-heading"><h2>BÌNH CHỌN MERCH</h2><button class="identity" id="identity"><span>Đổi số điện thoại</span></button></div><div class="collection-tools"><label for="sort-order">Sắp xếp</label><select id="sort-order"><option value="default">Mặc định</option><option value="desc">Lượt bình chọn: cao đến thấp</option><option value="asc">Lượt bình chọn: thấp đến cao</option></select></div><div id="cards" class="cards"></div></section>
</main>
<details class="sample-settings" id="demo-banner" hidden><summary aria-label="Cài đặt ảnh mẫu">⚙</summary><div class="sample-controls"><label>Ảnh logo<input type="file" id="logo-upload" accept="image/png,image/jpeg,image/webp"></label><label>Ảnh merch<input type="file" id="upload" accept="image/png,image/jpeg,image/webp"></label><button id="download-demo" type="button">Tải bản mẫu</button><small>Bản mẫu · phiếu chỉ lưu trên thiết bị này</small></div></details>
<dialog id="phone-dialog" aria-label="Số điện thoại bình chọn"><form id="phone-form"><button type="button" class="close" aria-label="Đóng">×</button><label for="phone">Số điện thoại</label><input id="phone" type="tel" autocomplete="tel" placeholder="Nhập số điện thoại" required maxlength="20" aria-describedby="phone-error"><p id="phone-error" role="alert"></p><button class="primary submit" type="submit">Xác nhận & bình chọn</button><button type="button" class="forget">Quên số trên thiết bị này</button></form></dialog><div id="toast" role="status"></div>`;
const dialog = document.querySelector('dialog');
const format = n => new Intl.NumberFormat('vi-VN').format(n);
const imageUrls = new Map();
function displayImage(image) {
 if (!image?.startsWith('data:image/') || !URL.createObjectURL) return image;
 if (!imageUrls.has(image)) {
  const comma = image.indexOf(',');
  const type = image.slice(5, image.indexOf(';'));
  const bytes = Uint8Array.from(atob(image.slice(comma + 1)), char => char.charCodeAt(0));
  imageUrls.set(image, URL.createObjectURL(new Blob([bytes], {type})));
 }
 return imageUrls.get(image);
}
window.addEventListener('pagehide', e => { if (!e.persisted) { imageUrls.forEach(url=>URL.revokeObjectURL(url));imageUrls.clear(); } });
function imageMarkup(id) { const image = photo || photos[id - 1]; return image ? `<img src="${displayImage(image)}" alt="Merch ${id}" loading="lazy" decoding="async" width="1500" height="1500">` : '<span class="image-empty" aria-label="Chờ ảnh merch gốc">＋</span>'; }
function button(id) { return `<button class="vote ${voted.includes(id) ? 'done' : ''}" data-vote="${id}" ${connecting || busy || voted.includes(id) ? 'disabled' : ''}>${voted.includes(id) ? '✓ Đã bình chọn' : !ready ? (connecting ? 'Đang kết nối…' : 'Thử lại bình chọn') : '♡ Bình chọn ngay'}</button>`; }
function render() {
 const ranked = sortMerch(counts.map((count, i) => ({ id: i + 1, count })), 'desc');
 document.querySelector('#hero-logo').innerHTML = logo ? `<img src="${logo}" alt="Logo Túc Tắc">` : '<button class="logo-empty" type="button" aria-label="Chọn file logo gốc">＋</button>';
 document.querySelector('.logo-empty')?.addEventListener('click', () => document.querySelector('#logo-upload').click());
 document.querySelector('#podium').innerHTML = [1,0,2].map(index => { const m = ranked[index]; return `<article class="podium-card place-${index+1}"><div class="place-label">TOP ${index+1}</div><div class="podium-image">${imageMarkup(m.id)}<span class="rank-medal">${index+1}</span></div><div class="podium-info"><strong>${format(m.count)}</strong><span>lượt bình chọn</span>${button(m.id)}</div></article>`; }).join('');
 const items = sortMerch(ranked, sortOrder);
 document.querySelector('#cards').innerHTML = items.length ? items.map(m => `<article class="merch-card" data-merch-id="${m.id}"><div class="merch-image">${imageMarkup(m.id)}${voted.includes(m.id)?'<span class="voted-mark">✓</span>':''}</div><div class="card-bottom"><div class="vote-total"><strong>${format(m.count)}</strong><span>lượt bình chọn</span></div>${button(m.id)}</div></article>`).join('') : '<p class="empty">Bạn chưa bình chọn món nào. Ghé mục Tất cả merch để gửi phiếu nhé!</p>';
 document.querySelector('#identity').hidden = !phone;
 document.querySelector('#demo-banner').hidden = !demo;
 document.querySelector('#voting-status').hidden = demo || connecting || ready;

}
function toast(message) { const el=document.querySelector('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),4000); }
async function api(body) { const res=await fetch('/api/votes',body ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)} : {}); const data=await res.json(); if(!res.ok) throw new Error(data.error || 'Chưa kết nối được hệ thống.'); return data; }
async function refresh() {
 connecting=true; render();
 try {
 if(demo) { counts=Array.from({length:photos.length},(_,i)=>Object.values(demoVotes).filter(ids=>ids.includes(i+1)).length); voted=demoVotes[phone] || []; ready=true; }
 else { const data=await api(); counts=Array.from({length:photos.length},(_,i)=>data.counts.find(m=>m.id===i+1)?.count || 0); voted=phone ? (await api({phone,id:1,action:'status'})).voted : []; ready=true; }
 } catch(error) { ready=false; throw error; }
 finally { connecting=false; render(); }
}
async function vote(id) {
 if(busy || connecting) return;
 if(!ready) {
  try { await refresh(); }
  catch { toast('Chưa kết nối được hệ thống. Phiếu chưa được gửi. Bạn thử lại sau nhé.'); return; }
 }
 if(!phone) { pending=id; document.querySelector('.submit').textContent='Xác nhận & bình chọn'; document.querySelector('#phone-error').textContent=''; dialog.showModal(); return; }
 busy=true; render();
 try {
  let duplicate=false;
  if(demo) { const ids=demoVotes[phone] || []; duplicate=ids.includes(id); if(!duplicate) { demoVotes[phone]=[...ids,id]; save(demoVotesKey,demoVotes); } }
  else duplicate=(await api({phone,id})).duplicate;
  await refresh(); toast(duplicate ? 'Số điện thoại này đã bình chọn merch này rồi nhé!' : 'Đã gửi một phiếu yêu thương. Cảm ơn bạn! ♡');
 } catch { toast('Chưa gửi được phiếu. Bạn thử lại sau nhé.'); }
 finally { busy=false; render(); }
}
app.addEventListener('click',e=>{const b=e.target.closest('[data-vote]'); if(b) vote(Number(b.dataset.vote));});
document.querySelector('#identity').onclick=()=>{pending=null; document.querySelector('#phone').value=phone; document.querySelector('#phone-error').textContent=''; document.querySelector('.submit').textContent='Lưu số điện thoại';dialog.showModal();};
document.querySelector('.close').onclick=()=>dialog.close();
document.querySelector('.forget').onclick=()=>{phone='';voted=[];save('tuctac-phone','');dialog.close();render();toast('Đã quên số trên thiết bị này. Phiếu đã gửi vẫn được giữ.');};
document.querySelector('#phone-form').onsubmit=async e=>{e.preventDefault();const normalized=normalizePhone(document.querySelector('#phone').value);if(!normalized){document.querySelector('#phone-error').textContent='Bạn nhập số di động Việt Nam hợp lệ gồm 10 chữ số nhé.';return;}phone=normalized;save('tuctac-phone',phone);dialog.close();const id=pending;pending=null;if(id)await vote(id);else try{await refresh();}catch{toast('Chưa tải được phiếu của số này.');}};
function selectImage(input, type) {
 input.onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 15*1024*1024) { toast('Chọn ảnh JPG, PNG hoặc WebP dưới 15 MB.'); return; }
  const reader = new FileReader();
  reader.onload = () => {
   // Embed the original bytes: no canvas, cropping, compression or color filters.
   if(type === 'logo') { logo=reader.result; save('tuctac-logo-image',logo); }
   else { photo=reader.result; save('tuctac-merch-image',photo); }
   render();
  };
  reader.readAsDataURL(file);
 };
}
selectImage(document.querySelector('#upload'), 'merch');
selectImage(document.querySelector('#logo-upload'), 'logo');
document.querySelector('#download-demo').hidden = !window.__TUCTAC_STANDALONE__;
document.querySelector('#download-demo').onclick = () => {
 const encoded = JSON.stringify({logo, photo, photos}).replaceAll('<','\\u003c');
 const doc = new DOMParser().parseFromString(originalHtml, 'text/html');
 doc.querySelector('#tuctac-assets').textContent = encoded;
 const html = '<!doctype html>' + doc.documentElement.outerHTML;
 const url=URL.createObjectURL(new Blob([html], {type:'text/html;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download='Tuc-Tac-Merch-Demo.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
if(window.__TUCTAC_ASSETS__) {
 logo=window.__TUCTAC_ASSETS__.logo || logo;
 photo=window.__TUCTAC_ASSETS__.photo || photo;
 if(Array.isArray(window.__TUCTAC_ASSETS__.photos) && window.__TUCTAC_ASSETS__.photos.length > 0 && window.__TUCTAC_ASSETS__.photos.length <= maxMerchCount) photos=window.__TUCTAC_ASSETS__.photos;
}
counts = Array(photos.length).fill(0);
document.querySelector('#sort-order').onchange = e => { sortOrder=e.target.value;render(); };
render();refresh().catch(()=>{toast('Chưa kết nối dữ liệu bình chọn. Vui lòng thử lại sau.');});
