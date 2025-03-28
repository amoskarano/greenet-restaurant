const admin = require('firebase-admin');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

exports.handler = async (event, context) => {
    // Verify Firebase ID token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        switch (event.httpMethod) {
            case 'POST':
                return await handle2FASetup(event, uid);
            case 'PUT':
                return await handle2FAVerification(event, uid);
            case 'DELETE':
                return await handle2FADisabling(event, uid);
            default:
                return {
                    statusCode: 405,
                    body: JSON.stringify({ error: 'Method not allowed' })
                };
        }
    } catch (error) {
        console.error('2FA Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// Generate new 2FA secret and QR code
async function handle2FASetup(event, uid) {
    const secret = speakeasy.generateSecret({
        name: `GREENET Admin (${uid})`,
        issuer: 'GREENET Restaurant'
    });

    // Generate QR code as data URL
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Store temporary secret in Firestore
    await admin.firestore().collection('admin2FA').doc(uid).set({
        secret: secret.base32,
        temp: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
        statusCode: 200,
        body: JSON.stringify({
            secret: secret.base32,
            qrCodeUrl,
            otpauthUrl: secret.otpauth_url
        })
    };
}

// Verify 2FA code and enable protection
async function handle2FAVerification(event, uid) {
    const { code } = JSON.parse(event.body);
    const doc = await admin.firestore().collection('admin2FA').doc(uid).get();

    if (!doc.exists) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: '2FA not initialized' })
        };
    }

    const verified = speakeasy.totp.verify({
        secret: doc.data().secret,
        encoding: 'base32',
        token: code,
        window: 1 // Allow 30s time variance
    });

    if (verified) {
        // Mark as verified and update user claims
        await admin.firestore().collection('admin2FA').doc(uid).update({
            temp: false,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        await admin.auth().setCustomUserClaims(uid, {
            ...(await admin.auth().getUser(uid)).customClaims,
            twoFactorEnabled: true,
            twoFactorVerified: true
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } else {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid verification code' })
        };
    }
}

// Disable 2FA for a user (admin only)
async function handle2FADisabling(event, uid) {
    const { targetUserId } = JSON.parse(event.body);
    const requester = await admin.auth().getUser(uid);

    // Only super admins can disable 2FA
    if (!requester.customClaims?.superAdmin) {
        return {
            statusCode: 403,
            body: JSON.stringify({ error: 'Forbidden' })
        };
    }

    await admin.firestore().collection('admin2FA').doc(targetUserId).delete();
    await admin.auth().setCustomUserClaims(targetUserId, {
        ...(await admin.auth().getUser(targetUserId)).customClaims,
        twoFactorEnabled: false,
        twoFactorVerified: false
    });

    return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
    };
}