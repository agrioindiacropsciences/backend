import * as admin from 'firebase-admin';

/**
 * Firebase Admin initialization
 * Handles both local file-based credentials and production environment variables.
 */
const getCredentials = () => {
    // 1. Check for environment variables (Best for production like Vercel/Render)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        let privateKey = process.env.FIREBASE_PRIVATE_KEY;

        // Remove surrounding quotes if present (often happens if user pastes with quotes)
        if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        } else if (privateKey.startsWith("'") && privateKey.endsWith("'")) {
            privateKey = privateKey.substring(1, privateKey.length - 1);
        }

        // Replace literal \n markers with actual newline characters
        // We do this twice to handle potential double-escaping (common on some platforms)
        privateKey = privateKey.replace(/\\n/g, '\n');

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
