import * as admin from 'firebase-admin';

/**
 * Firebase Admin initialization
 * Handles both local file-based credentials and production environment variables.
 */
const getCredentials = () => {
    // 1. Check for environment variables (Best for production like Vercel/Render)
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        return {
            projectId: process.env.FIREBASE_PROJECT_ID || 'agrio-india-crop-science',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Replace literal \n strings with real newline characters
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
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
