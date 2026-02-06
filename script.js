// ==========================================
// 設定區域 (請填入 Google Apps Script 網址)
// ==========================================
const API_URL = "https://script.google.com/macros/s/AKfycbxgFZ1YqJxvWeLyMItIVfMkOJkdFsehigEQW_YCNU2A9cvQYZjJUTn5tx54I0waubD6/exec"; 
// 例如: "https://script.google.com/macros/s/AKfycbx.../exec"

// ==========================================
// 1. 資料庫邏輯 (改為 Google Sheets 雲端讀取)
// ==========================================
let productsData = []; // 用來暫存從雲端抓下來的資料

// 初始化：從 Google Sheets 抓資料
async function initProducts() {
    const container = document.getElementById('product-grid');
    
    // 顯示載入中狀態
    if(container) {
        container.innerHTML = `
            <div style="text-align:center; padding: 20px; color: #666;">
                ⏳ 正在載入最新花禮目錄...
            </div>`;
    }

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        productsData = data; // 存入全域變數
        renderFrontProducts(); // 資料抓到了，開始畫畫面
    } catch (error) {
        console.error("讀取失敗", error);
        if(container) {
            container.innerHTML = `
                <div style="text-align:center; padding: 20px; color: red;">
                    ❌ 載入失敗<br>請確認網路連線或是 Google Sheets 設定
                </div>`;
        }
    }
}

// 渲染前台商品
function renderFrontProducts() {
    const container = document.getElementById('product-grid');
    if (!container) return;
    
    container.innerHTML = ''; // 清空載入中訊息
    
    if (productsData.length === 0) {
        container.innerHTML = '<p style="text-align:center;">目前沒有上架商品</p>';
        return;
    }

    productsData.forEach(p => {
        // 確保價格是數字 (Google Sheets 有時會傳字串)
        const price = parseInt(p.price) || 0; 
        
        const div = document.createElement('div');
        div.className = 'product-card';
        div.innerHTML = `
            <div class="img-placeholder" style="background-image: url('${p.image}'); background-size: cover; background-position: center;"></div>
            <h3>${p.name}</h3>
            <p class="price">NT$ ${price.toLocaleString()}</p>
            <button class="btn-add" onclick="addToCart(${p.id})">加入清單</button>
        `;
        container.appendChild(div);
    });
}

// ==========================================
// 2. 購物車邏輯 (保持不變，但資料來源改為 productsData)
// ==========================================
let cart = [];

function addToCart(id) {
    // 從雲端資料中尋找商品
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    const existing = cart.find(i => i.id === id);
    
    if (existing) {
        existing.qty++;
    } else {
        cart.push({ 
            id: product.id,
            name: product.name,
            price: parseInt(product.price),
            qty: 1 
        });
    }
    renderCart();
    
    // 簡單提示並滾動
    document.getElementById('cart-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function renderCart() {
    const tbody = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-grand-total');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let total = 0;
    
    if(cart.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:#888;padding:20px;">您的清單是空的</td></tr>';
        totalEl.innerText = '0';
        return;
    }

    cart.forEach((item, idx) => {
        const subtotal = item.price * item.qty;
        total += subtotal;
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td><input type="number" min="1" value="${item.qty}" onchange="updateQty(${idx}, this.value)" style="width:50px; text-align:center;"></td>
                <td>${subtotal.toLocaleString()}</td>
                <td><button onclick="removeFromCart(${idx})" style="background:#e74c3c;color:white;border:none;border-radius:3px;padding:5px 10px;cursor:pointer;">移除</button></td>
            </tr>
        `;
    });
    totalEl.innerText = total.toLocaleString();
}

function updateQty(idx, val) {
    let newQty = parseInt(val);
    if (isNaN(newQty) || newQty < 1) newQty = 1;
    cart[idx].qty = newQty;
    renderCart();
}

function removeFromCart(idx) {
    cart.splice(idx, 1);
    renderCart();
}

// ==========================================
// 3. 發送訊息到 LINE (保持不變)
// ==========================================
function sendToLine() {
    if (cart.length === 0) { alert("請先選擇商品"); return; }
    
    const deceasedName = document.getElementById('deceasedName').value;
    const location = document.getElementById('location').value;
    const deliveryTime = document.getElementById('deliveryTime').value;
    const cardFrom = document.getElementById('cardFrom').value;
    const buyerPhone = document.getElementById('buyerPhone').value;
    
    if (!deceasedName || !location || !cardFrom || !buyerPhone) {
        alert("請填寫所有必填欄位"); return;
    }

    // 組合商品清單文字
    let itemsText = "";
    let grandTotal = 0;
    cart.forEach(item => {
        const sub = item.price * item.qty;
        grandTotal += sub;
        itemsText += `▫️ ${item.name} x ${item.qty} (NT$${sub})\n`;
    });

    // 組合最終訊息
    const message = 
`【新訂單需求】
----------------
${itemsText}
----------------
💰 總計：NT$ ${grandTotal.toLocaleString()}
----------------
📍 配送資訊
逝者：${deceasedName}
地點：${location}
時間：${deliveryTime.replace('T', ' ')}
----------------
📝 卡片內容
上款：${document.getElementById('cardTo').value || ""}
中款：${document.getElementById('cardBody').value}
下款：${cardFrom}
----------------
📞 聯絡電話：${buyerPhone}`;

    // 跳轉 LINE
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`;
    window.location.href = url;
}

// ==========================================
// 4. 系統初始化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    initProducts(); // 啟動時從 Google Sheets 抓資料
    renderCart();   // 初始化購物車介面
    
    // Admin 相關的程式碼已移除，因為現在透過 Google Sheets 管理
});
