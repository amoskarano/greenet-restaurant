import { db, auth, functions } from './firebase.js';

// DOM Elements
const adminsList = document.getElementById('adminsList');
const inviteEmailInput = document.getElementById('inviteEmail');
const sendInviteBtn = document.getElementById('sendInviteBtn');
const logoutBtn = document.getElementById('logoutBtn');
const currentUserEmail = document.getElementById('currentUserEmail');
const tfaStatus = document.getElementById('tfaStatus');
const enableTfaBtn = document.getElementById('enableTfaBtn');
const recentOrdersList = document.getElementById('recentOrdersList');

// Current User Data
let currentAdmin = null;

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verify authentication
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '/login.html';
                return;
            }

            // Check admin status
            const token = await user.getIdTokenResult();
            if (!token.claims.admin) {
                window.location.href = '/login.html';
                return;
            }

            currentAdmin = {
                uid: user.uid,
                email: user.email,
                isSuperAdmin: token.claims.superAdmin || false
            };

            // Load UI
            loadAdminInfo();
            loadAdminsList();
            loadRecentOrders();
            setupEventListeners();
        });
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Failed to load dashboard');
    }
});

// Load Admin Information
function loadAdminInfo() {
    currentUserEmail.textContent = currentAdmin.email;

    // Check 2FA status
    db.collection('admin2FA').doc(currentAdmin.uid).get()
        .then(doc => {
            const tfaEnabled = doc.exists && !doc.data().temp;
            tfaStatus.textContent = tfaEnabled ? 'Enabled' : 'Disabled';
            tfaStatus.className = tfaEnabled ? 'badge badge-success' : 'badge badge-danger';
            enableTfaBtn.textContent = tfaEnabled ? 'Manage 2FA' : 'Enable 2FA';
        });
}

// Load Admins List
function loadAdminsList() {
    db.collection('adminUsers').orderBy('createdAt', 'desc').onSnapshot(snapshot => {
        adminsList.innerHTML = '';

        snapshot.forEach(doc => {
            const admin = doc.data();
            const adminItem = document.createElement('div');
            adminItem.className = 'admin-item';

            adminItem.innerHTML = `
                <div class="admin-info">
                    <span class="admin-email">${admin.email}</span>
                    <span class="admin-date">${formatDate(admin.createdAt)}</span>
                </div>
                <div class="admin-actions">
                    ${admin.isSuperAdmin ? '<span class="badge badge-warning">Super Admin</span>' : ''}
                    ${currentAdmin.isSuperAdmin && !admin.isSuperAdmin ? `
                        <button class="btn btn-sm btn-danger revoke-btn" data-uid="${doc.id}">
                            Revoke
                        </button>
                    ` : ''}
                </div>
            `;

            adminsList.appendChild(adminItem);
        });

        // Add event listeners to revoke buttons
        document.querySelectorAll('.revoke-btn').forEach(btn => {
            btn.addEventListener('click', revokeAdmin);
        });
    });
}

// Load Recent Orders
function loadRecentOrders() {
    db.collection('orders')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .onSnapshot(snapshot => {
            recentOrdersList.innerHTML = '';

            snapshot.forEach(doc => {
                const order = doc.data();
                const orderItem = document.createElement('div');
                orderItem.className = 'order-item';

                orderItem.innerHTML = `
                    <div class="order-id">#${doc.id.substring(0, 5)}</div>
                    <div class="order-table">Table ${order.table}</div>
                    <div class="order-items">${order.items.length} items</div>
                    <div class="order-status ${order.status}">${order.status}</div>
                    <div class="order-time">${formatTime(order.timestamp)}</div>
                `;

                recentOrdersList.appendChild(orderItem);
            });
        });
}

// Event Listeners
function setupEventListeners() {
    // Send Invite
    sendInviteBtn.addEventListener('click', async () => {
        const email = inviteEmailInput.value.trim();

        if (!email || !validateEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            sendInviteBtn.disabled = true;
            sendInviteBtn.textContent = 'Sending...';

            const sendInvite = functions.httpsCallable('adminInvite');
            await sendInvite({ email });

            alert(`Invite sent to ${email}`);
            inviteEmailInput.value = '';
        } catch (error) {
            console.error('Invite error:', error);
            alert(`Failed to send invite: ${error.message}`);
        } finally {
            sendInviteBtn.disabled = false;
            sendInviteBtn.textContent = 'Send Invite';
        }
    });

    // 2FA Management
    enableTfaBtn.addEventListener('click', () => {
        window.location.href = '/admin/setup-2fa.html';
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = '/login.html';
        });
    });
}

// Revoke Admin Access
async function revokeAdmin(event) {
    const uid = event.target.dataset.uid;

    if (!confirm(`Revoke admin access for this user?`)) return;

    try {
        await db.collection('adminUsers').doc(uid).delete();
        // Cloud Function will handle auth claims cleanup
    } catch (error) {
        console.error('Revoke error:', error);
        alert('Failed to revoke admin access');
    }
}

// Helper Functions
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleDateString();
}

function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}