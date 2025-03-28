let menuItems = [];
let quickOrderItems = [];
let currentTable = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (!db) {
        console.error('Firestore not initialized');
        return;
    }

    // Load menu from Firebase
    db.collection("menuItems").onSnapshot(snapshot => {
        menuItems = [];
        snapshot.forEach(doc => {
            menuItems.push({ id: doc.id, ...doc.data() });
        });
        renderMenu();
    }, error => {
        console.error('Menu load error:', error);
    });

    // Set up order confirmation
    const confirmQuickOrder = document.getElementById('confirmQuickOrder');
    if (confirmQuickOrder) {
        confirmQuickOrder.addEventListener('click', async () => {
            if (quickOrderItems.length === 0) {
                alert('Please add items to your order');
                return;
            }

            const orderData = {
                items: quickOrderItems,
                table: currentTable,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            try {
                const docRef = await db.collection('orders').add(orderData);
                alert(`Order #${docRef.id.substring(0, 5)} placed successfully!`);
                quickOrderItems = [];
                updateQuickOrderSummary();
            } catch (error) {
                console.error('Order error:', error);
                alert('Failed to place order');
            }
        });
    }
});

function renderMenu() {
    const container = document.getElementById('menuDisplay');
    if (!container) return;

    container.innerHTML = menuItems.map(item => `
        <div class="menu-card" data-id="${item.id}" onclick="addToQuickOrder('${item.id}')">
            <img src="images/${item.image || 'default.jpg'}" alt="${item.name}" onerror="this.src='images/default.jpg'">
            <h3>${item.name}</h3>
            <p class="price">Ksh ${item.price.toLocaleString()}</p>
            ${item.description ? `<p class="desc">${item.description}</p>` : ''}
        </div>
    `).join('');

    const tableSelect = document.getElementById('tableSelect');
    if (tableSelect) {
        tableSelect.addEventListener('change', (e) => {
            currentTable = parseInt(e.target.value);
        });
    }
}

window.addToQuickOrder = (itemId) => {
    const item = menuItems.find(i => i.id === itemId);
    if (!item) return;

    const existingItem = quickOrderItems.find(i => i.id === itemId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        quickOrderItems.push({
            ...item,
            quantity: 1
        });
    }

    updateQuickOrderSummary();

    const card = document.querySelector(`.menu-card[data-id="${itemId}"]`);
    if (card) {
        card.classList.add('item-added');
        setTimeout(() => card.classList.remove('item-added'), 300);
    }
};

function updateQuickOrderSummary() {
    const summary = document.getElementById('quickOrderSummary');
    const total = document.getElementById('quickOrderTotal');
    if (!summary || !total) return;

    if (quickOrderItems.length === 0) {
        summary.innerHTML = '<p>No items selected</p>';
        total.textContent = '0';
        return;
    }

    summary.innerHTML = quickOrderItems.map(item => `
        <div class="order-item">
            <span>${item.name} × ${item.quantity}</span>
            <span>Ksh ${(item.price * item.quantity).toLocaleString()}</span>
        </div>
    `).join('');

    total.textContent = quickOrderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString();
}