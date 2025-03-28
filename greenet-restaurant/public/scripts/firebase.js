const firebaseConfig = {
    apiKey: "AIzaSyAdp2npjai96_VNZap501Cf9XzuyZGo1To",
    authDomain: "greenet-restaurant.firebaseapp.com",
    projectId: "greenet-restaurant",
    storageBucket: "greenet-restaurant.appspot.com",
    messagingSenderId: "132135766862",
    appId: "1:132135766862:web:e0e765e22abd4ad23dac1f"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const functions = firebase.functions();

// Enhanced auth state handler with 2FA check
auth.onAuthStateChanged(async (user) => {
    const adminPaths = ['/admin', '/analytics', '/menu-edit', '/admin-dashboard'];
    const isAdminPath = adminPaths.some(path => window.location.pathname.includes(path));

    if (user) {
        const token = await user.getIdTokenResult();
        if (isAdminPath && !token.claims.admin) {
            window.location.href = '/login.html';
        }

        // Check 2FA requirement
        if (token.claims.admin && !token.claims.twoFactorVerified) {
            const doc = await db.collection('admin2FA').doc(user.uid).get();
            if (doc.exists && !doc.data().temp) {
                window.location.href = '/verify-2fa.html';
            }
        }
    } else if (isAdminPath) {
        window.location.href = '/login.html';
    }
});

window.logout = () => {
    auth.signOut().then(() => {
        window.location.href = '/login.html';
    });
};