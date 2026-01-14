import * as admin from 'firebase-admin';
import path from 'path';

const serviceAccount = require(path.join(__dirname, '../config/firebase-service-account.json'));

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: "agrio-india-crop-science.firebasestorage.app"
    });
}

export const messaging = admin.messaging();
export const firestore = admin.firestore();
export default admin;
