document.addEventListener('DOMContentLoaded', async () => {
    if (!auth.currentUser) {
        window.location.href = '/login.html';
        return;
    }

    try {
        const setup2FA = functions.httpsCallable('setup2FA');
        const { data } = await setup2FA({ uid: auth.currentUser.uid });

        document.getElementById('qrCode').src =
            `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(data.otpauthUrl)}`;
        document.getElementById('manualCode').textContent = data.base32;
    } catch (error) {
        console.error(error);
        alert('2FA setup failed: ' + error.message);
    }
});

async function verify2FASetup() {
    const code = prompt('Enter 6-digit code from your authenticator app');
    if (!code) return;

    try {
        const verify2FA = functions.httpsCallable('verify2FA');
        await verify2FA({
            uid: auth.currentUser.uid,
            code
        });
        alert('2FA setup complete!');
        window.location.href = '/admin.html';
    } catch (error) {
        console.error(error);
        alert('Verification failed: ' + error.message);
    }
}