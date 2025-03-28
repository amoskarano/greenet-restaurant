document.addEventListener('DOMContentLoaded', () => {
    // SMS Toggle
    const enableSMS = document.getElementById('enableSMS');
    const phoneInput = document.getElementById('customerPhone');
    if (enableSMS && phoneInput) {
        enableSMS.addEventListener('change', () => {
            phoneInput.disabled = !enableSMS.checked;
            if (phoneInput.disabled) phoneInput.value = '';
        });
    }

    // Order Submission
    const submitOrder = document.getElementById('submitOrder');
    if (submitOrder) {
        submitOrder.addEventListener('click', async () => {
            const tableNumber = document.getElementById('tableNumber').value;
            const phone = enableSMS?.checked ? document.getElementById('customerPhone').value : null;

            if (!tableNumber) {
                alert('Please select a table number');
                return;
            }

            if (enableSMS?.checked && (!phone || !/^07\d{8}$/.test(phone))) {
                alert('Please enter a valid Kenyan phone number (07XXXXXXXX)');
                return;
            }

            const orderData = {
                table: tableNumber,
                items: quickOrderItems,
                status: 'pending',
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ...(phone && { customerPhone: `+254${phone.substring(1)}` })
            };

            try {
                const docRef = await db.collection('orders').add(orderData);

                // Send SMS confirmation if enabled
                if (phone) {
                    await sendSMS(
                        phone,
                        `Your order #${docRef.id.substring(0, 5)} has been received. Table ${tableNumber}`
                    );
                }

                alert(`Order #${docRef.id.substring(0, 5)} placed successfully!`);
                quickOrderItems = [];
                updateQuickOrderSummary();

                // Return to menu
                window.location.href = 'menu.html';
            } catch (error) {
                console.error('Order error:', error);
                alert('Failed to place order: ' + error.message);
            }
        });
    }
});

async function sendSMS(phone, message) {
    try {
        const response = await fetch('/.netlify/functions/send-sms', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message })
        });

        if (!response.ok) throw new Error('SMS failed');
        return await response.json();
    } catch (error) {
        console.error('SMS error:', error);
        throw error;
    }
}