// Initialize auth state listener
auth.onAuthStateChanged(async (user) => {
    const authButtons = document.getElementById('authButtons');
    const authAction = document.getElementById('authAction');

    if (user) {
        // User is logged in
        const token = await user.getIdTokenResult();

        authButtons.innerHTML = token.claims.admin
            ? `<a href="admin/admin.html" class="btn">Admin Dashboard</a>
           <button onclick="logout()" class="btn logout-btn">Logout</button>`
            : `<button onclick="logout()" class="btn logout-btn">Logout</button>`;

        authAction.innerHTML = `
        <a href="menu.html" class="btn btn-large">Order Now</a>
        ${token.claims.admin ? `<a href="admin/admin.html" class="btn btn-large">Admin Portal</a>` : ''}
      `;
    } else {
        // User is logged out
        authButtons.innerHTML = `
        <a href="login.html" class="btn admin-btn">Admin Login</a>
      `;
        authAction.innerHTML = `
        <a href="menu.html" class="btn btn-large">Order Now</a>
      `;
    }
});

// Global logout function
window.logout = () => {
    auth.signOut()
        .then(() => window.location.reload())
        .catch(err => console.error('Logout error:', err));
};