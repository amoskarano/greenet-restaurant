document.addEventListener('DOMContentLoaded', () => {
    if (!db) {
        console.error('Firestore not initialized');
        return;
    }

    let salesChart = null;

    const updateAnalytics = () => {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        db.collection('orders')
            .where('timestamp', '>=', todayStart)
            .where('timestamp', '<=', todayEnd)
            .get()
            .then(snapshot => {
                const { revenue, popularItems } = processOrders(snapshot.docs);
                updateDashboard(revenue, popularItems);
            })
            .catch(err => {
                console.error('Analytics error:', err);
            });
    };

    const processOrders = (orders) => {
        let revenue = 0;
        const items = {};

        orders.forEach(order => {
            const orderData = order.data();
            revenue += orderData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            orderData.items.forEach(item => {
                items[item.name] = (items[item.name] || 0) + item.quantity;
            });
        });

        const popularItems = Object.entries(items)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return { revenue, popularItems };
    };

    const updateDashboard = (revenue, popularItems) => {
        document.getElementById('todayRevenue').textContent = `Ksh ${revenue.toLocaleString()}`;
        document.getElementById('topItem').textContent = popularItems[0]?.[0] || 'No data';

        const ctx = document.getElementById('salesChart').getContext('2d');

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: popularItems.map(item => item[0]),
                datasets: [{
                    label: 'Items Sold',
                    data: popularItems.map(item => item[1]),
                    backgroundColor: '#28a745'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    };

    updateAnalytics();
    setInterval(updateAnalytics, 300000);
});