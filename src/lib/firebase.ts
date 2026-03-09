import * as admin from 'firebase-admin';

/**
 * Firebase Admin initialization
 * Handles both local file-based credentials and production environment variables.
 */
const getCredentials = () => {
    // 1. Check for environment variables (Best for production like Vercel/Render)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();

        // Remove any surrounding quotes (matches "key" or 'key')
        privateKey = privateKey.replace(/^["']|["']$/g, '');

        // Replace literal \n markers with real newline characters
        // We handle both \n and \\n just in case of double escaping
        privateKey = privateKey.replace(/\\n/g, '\n');

        // Verify the key structure (must start and end with standard PEM tags)
        if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
            console.error('[Firebase] Private key is missing BEGIN tag.');
        }

        console.log(`[Firebase] Initializing with Env Vars. PK Length: ${privateKey.length}, Project: ${process.env.FIREBASE_PROJECT_ID || 'agrio-india-crop-science'}`);

        return {
            projectId: process.env.FIREBASE_PROJECT_ID || 'agrio-india-crop-science',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: privateKey,
        };
    }

    // 2. Fallback to local file for development
    try {
        const path = require('path');
        return require(path.join(__dirname, '../config/firebase-service-account.json'));
    } catch (error) {
        console.warn("Firebase service account file not found, and environment variables are missing.");
        return null;
    }
};

const credentials = getCredentials();

if (!admin.apps.length && credentials) {
    admin.initializeApp({
        credential: admin.credential.cert(credentials),
        storageBucket: "agrio-india-crop-science.firebasestorage.app"
    });
}

export const messaging = admin.messaging();
export const firestore = admin.firestore();
export default admin;
