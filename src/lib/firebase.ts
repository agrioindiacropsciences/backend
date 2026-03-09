import * as admin from 'firebase-admin';

/**
 * Firebase Admin initialization
 * Handles both local file-based credentials and production environment variables.
 */
const getCredentials = () => {
    const { FIREBASE_CONFIG_BASE64, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID } = process.env;

    // 1. BEST METHOD: Base64 JSON (Foolproof against formatting issues)
    if (FIREBASE_CONFIG_BASE64) {
        try {
            const jsonStr = Buffer.from(FIREBASE_CONFIG_BASE64, 'base64').toString('utf8');
            const creds = JSON.parse(jsonStr);
            console.log(`[Firebase] Initialized via Base64 Config. Project: ${creds.project_id}`);
            return creds;
        } catch (e) {
            console.error("[Firebase] Failed to parse FIREBASE_CONFIG_BASE64:", e);
        }
    }

    // 2. Individual Environment Variables
    if (FIREBASE_PRIVATE_KEY && FIREBASE_CLIENT_EMAIL) {
        let pk = FIREBASE_PRIVATE_KEY.trim();
        pk = pk.replace(/^["']|["']$/g, '');
        pk = pk.replace(/\\n/g, '\n');

        // Ensure header and footer have proper newlines (pasted keys might be missing them)
        if (!pk.includes('\n') && pk.includes('-----BEGIN PRIVATE KEY-----')) {
            // If it's all one line, try a global fix (this happens sometimes on Render)
            pk = pk.replace(/-----BEGIN PRIVATE KEY-----/, '-----BEGIN PRIVATE KEY-----\n')
                .replace(/-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----\n');
        } else {
            // Standard fix: Ensure exactly one final newline
            pk = pk.trim() + '\n';
        }

        console.log(`[Firebase] Initialized via Individual Env Vars. PK Length: ${pk.length}. Project: ${FIREBASE_PROJECT_ID || 'agrio-india-crop-science'}`);
        return {
            projectId: FIREBASE_PROJECT_ID || 'agrio-india-crop-science',
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey: pk,
        };
    }

    // 3. Local File Fallback
    try {
        const path = require('path');
        const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');
        return require(serviceAccountPath);
    } catch (error) {
        console.warn("[Firebase] No credentials found in env or local config.");
        return null;
    }
};

const creds = getCredentials();

if (!admin.apps.length && creds) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(creds as admin.ServiceAccount),
            storageBucket: "agrio-india-crop-science.firebasestorage.app"
        });
        console.log("[Firebase] Successfully initialized.");
    } catch (e) {
        console.error("[Firebase] Initialization error:", e);
    }
}

export const messaging = admin.messaging();
export const firestore = admin.firestore();
export default admin;
