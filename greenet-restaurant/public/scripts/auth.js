document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value.trim();

            try {
                const userCredential = await auth.signInWithEmailAndPassword(email, password);
                const token = await userCredential.user.getIdTokenResult();

                if (token.claims.admin) {
                    // Check 2FA status
                    const doc = await db.collection('admin2FA').doc(userCredential.user.uid).get();
                    if (doc.exists) {
                        window.location.href = doc.data().temp
                            ? '../admin/setup-2fa.html'
                            : '../admin/admin.html';
                    } else {
                        window.location.href = '../admin/admin.html';
                    }
                } else {
                    await auth.signOut();
                    alert('Access denied. Only admin users can login.');
                }
            } catch (err) {
                console.error('Login error:', err);
                alert('Login failed: ' + err.message);
            }
        });
    }

    // Auto-redirect if already logged in
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            const token = await user.getIdTokenResult();
            if (token.claims.admin) {
                window.location.href = '../admin/admin.html';
            }
        }
    });
});