document.addEventListener('DOMContentLoaded', () => {
    if (!db) {
        console.error('Firestore not initialized');
        return;
    }

    // Load recent orders
    const ordersList = document.getElementById('ordersList');
    if (ordersList) {
        db.collection('orders')
            .orderBy('timestamp', 'desc')
            .limit(10)
            .onSnapshot(snapshot => {
                ordersList.innerHTML = '';
                snapshot.forEach(doc => {
                    const order = doc.data();
                    ordersList.innerHTML += `
                        <div class="order-item">
                            <span>Order #${doc.id.substring(0, 5)}</span>
                            <span>Table ${order.table || 'N/A'}</span>
                            <span>${order.items?.length || 0} items</span>
                            <span class="status ${order.status || 'pending'}">${order.status || 'pending'}</span>
                        </div>
                    `;
                });
            }, error => {
                console.error('Orders error:', error);
            });
    }

    // Menu item form
    const addItemForm = document.getElementById('addItemForm');
    if (addItemForm) {
        addItemForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const newItem = {
                name: document.getElementById('itemName').value.trim(),
                price: parseFloat(document.getElementById('itemPrice').value) || 0,
                category: document.getElementById('itemCategory').value,
                image: document.getElementById('itemImage').value.trim() || 'default.jpg',
                description: document.getElementById('itemDescription').value.trim(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!newItem.name) {
                alert('Item name is required');
                return;
            }

            try {
                await db.collection('menuItems').add(newItem);
                alert('Item added successfully!');
                addItemForm.reset();
            } catch (err) {
                console.error('Error adding item:', err);
                alert('Failed to add item');
            }
        });
    }

    // Load current menu items
    const itemsContainer = document.getElementById('currentItemsList');
    if (itemsContainer) {
        db.collection('menuItems').orderBy('createdAt').onSnapshot(snapshot => {
            itemsContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const item = doc.data();
                itemsContainer.innerHTML += `
                    <div class="menu-item-card">
                        <img src="../images/${item.image}" alt="${item.name}" onerror="this.src='../images/default.jpg'">
                        <div>
                            <h3>${item.name}</h3>
                            <p>Ksh ${item.price.toLocaleString()} • ${item.category}</p>
                            <button onclick="deleteMenuItem('${doc.id}')" class="btn btn-danger">Delete</button>
                        </div>
                    </div>
                `;
            });
        }, error => {
            console.error('Menu items error:', error);
        });
    }
});

window.deleteMenuItem = async (id) => {
    if (confirm('Are you sure you want to delete this item permanently?')) {
        try {
            await db.collection('menuItems').doc(id).delete();
        } catch (err) {
            console.error('Delete error:', err);
            alert('Failed to delete item');
        }
    }
};