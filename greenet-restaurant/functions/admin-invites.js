const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');
const crypto = require('crypto');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
}

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

exports.handler = async (event, context) => {
    // Verify Firebase ID token
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
            statusCode: 401,
            body: JSON.stringify({ error: 'Unauthorized' })
        };
    }

    try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);

        // Only allow existing admins to send invites
        const userDoc = await admin.firestore().collection('adminUsers').doc(decodedToken.uid).get();
        if (!userDoc.exists || !userDoc.data().isAdmin) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Forbidden: Admin access required' })
            };
        }

        const { email } = JSON.parse(event.body);

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Valid email required' })
            };
        }

        // Check if email already has access
        const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);
        if (existingUser) {
            const existingAccess = await admin.firestore().collection('adminUsers').doc(existingUser.uid).get();
            if (existingAccess.exists) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'User already has admin access' })
                };
            }
        }

        // Generate secure invite token (24h expiry)
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await admin.firestore().collection('adminInvites').doc(token).set({
            email,
            createdBy: decodedToken.uid,
            expiresAt,
            used: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send invitation email
        const inviteLink = `${process.env.BASE_URL}/admin/register?token=${token}`;

        await sgMail.send({
            to: email,
            from: process.env.SENDGRID_FROM_EMAIL,
            templateId: process.env.SENDGRID_INVITE_TEMPLATE_ID,
            dynamic_template_data: {
                invite_link: inviteLink,
                inviter_name: userDoc.data().name || 'Admin',
                expires_in: '24 hours'
            }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error('Invite Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};