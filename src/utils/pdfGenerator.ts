import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';
import axios from 'axios';

export interface CertificateData {
    winner_name: string;
    phone_number: string;
    full_address?: string;
    prize_name: string;
    coupon_code: string;
    won_date: string | Date;
    verification_id?: string;
    rank?: string | number;
    distributor_name?: string;
    serial_number?: string;
    auth_code?: string;
    reward_image_url?: string;
}

export const generateRewardCertificate = async (data: CertificateData): Promise<Buffer> => {
    // Generate QR Code as Data Buffer (PNG)
    const qrCodeBuffer = await QRCode.toBuffer(data.verification_id || 'VERIFICATION-PENDING', {
        margin: 1,
        width: 200,
        color: {
            dark: '#16a34a',
            light: '#ffffff'
        }
    });

    // Fetch Reward Image if exists
    let rewardImageBuffer: Buffer | null = null;
    if (data.reward_image_url) {
        try {
            const response = await axios.get(data.reward_image_url, { responseType: 'arraybuffer' });
            rewardImageBuffer = Buffer.from(response.data as any);
        } catch (err) {
            console.error('Error fetching reward image:', err);
        }
    }

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4',
            margin: 0,
            autoFirstPage: true,
            info: {
                Title: 'Reward Certificate - Agrio India',
                Author: 'Agrio India Crop Science',
            }
        });

        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            const pdfBuffer = Buffer.concat(buffers);
            resolve(pdfBuffer);
        });
        doc.on('error', reject);

        // Colors
        const primaryColor = '#16a34a';
        const secondaryColor = '#666666';
        const textColor = '#1a1a1a';

        // 1. Background and Border
        doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40)
            .lineWidth(8)
            .stroke(primaryColor);

        // 2. Header (Adjusted Y to avoid overlap)
        const logoPath = path.join(process.cwd(), 'public', 'assets', 'logo', 'logo.png');
        if (fs.existsSync(logoPath)) {
            // Keep logo size reasonable
            doc.image(logoPath, (doc.page.width - 120) / 2, 40, { width: 120 });
        } else {
            doc.fillColor(primaryColor).fontSize(28).font('Helvetica-Bold').text('AGRIO INDIA', 0, 60, { align: 'center', width: doc.page.width, lineBreak: false });
        }

        // Title and Subtitle pushed down significantly to avoid logo overlap
        doc.fillColor(primaryColor).fontSize(24).font('Helvetica-Bold').text('CERTIFICATE OF WINNING', 0, 180, { align: 'center', width: doc.page.width, lineBreak: false });
        doc.fillColor(secondaryColor).fontSize(14).font('Helvetica').text('Agrio India Crop Science', 0, 215, { align: 'center', width: doc.page.width, lineBreak: false });

        doc.strokeColor('#eeeeee').lineWidth(0.5).moveTo(80, 240).lineTo(doc.page.width - 80, 240).stroke();

        // 3. Details Sections (Shifted down and slightly larger font)
        const startX = 85;
        const contentWidth = doc.page.width - (startX * 2);

        const renderSection = (yStart: number, title: string, items: { label: string, value: string }[]) => {
            doc.rect(startX, yStart, contentWidth, 24).fill('#f1f5f1');
            doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold')
                .text(title.toUpperCase(), startX + 15, yStart + 7, { characterSpacing: 1, lineBreak: false });

            let y = yStart + 32;
            items.forEach(item => {
                doc.fillColor(secondaryColor).fontSize(12).font('Helvetica').text(item.label, startX + 15, y, { lineBreak: false });
                doc.fillColor(textColor).fontSize(12).font('Helvetica-Bold').text(item.value || '-', startX + 180, y, { align: 'right', width: contentWidth - 180 - 15, lineBreak: false });
                y += 20;
            });
        };

        const formattedDate = new Date(data.won_date).toLocaleString('en-IN', {
            day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        renderSection(260, 'User Details', [
            { label: 'Winner Name', value: data.winner_name },
            { label: 'Phone Number', value: data.phone_number },
            { label: 'Address', value: data.full_address || 'Profile incomplete' }
        ]);

        renderSection(355, 'Prize Details', [
            { label: 'Reward Item', value: data.prize_name },
            { label: 'Coupon Code', value: data.auth_code || data.coupon_code },
            { label: 'Serial Number', value: data.serial_number || '-' },
            { label: 'Scan Date', value: formattedDate }
        ]);

        // Reward Image Section (If available)
        let nextSectionY = 470;
        if (rewardImageBuffer) {
            doc.rect(startX, nextSectionY, contentWidth, 24).fill('#f1f5f1');
            doc.fillColor(primaryColor).fontSize(12).font('Helvetica-Bold')
                .text('REWARD PREVIEW', startX + 15, nextSectionY + 7, { characterSpacing: 1, lineBreak: false });

            try {
                const imgWidth = 160;
                const imgHeight = 100;
                const imgX = startX + (contentWidth - imgWidth) / 2;
                const imgY = nextSectionY + 40;
                const radius = 10;

                // Container Background (White)
                doc.roundedRect(imgX - 8, imgY - 8, imgWidth + 16, imgHeight + 16, radius)
                    .fill('#ffffff');

                // Container Border (Subtle Gray)
                doc.strokeColor('#e5e7eb').lineWidth(1)
                    .roundedRect(imgX - 8, imgY - 8, imgWidth + 16, imgHeight + 16, radius)
                    .stroke();

                // Draw Image with Rounded Corners using clipping
                doc.save();
                doc.roundedRect(imgX, imgY, imgWidth, imgHeight, radius - 2).clip();
                doc.image(rewardImageBuffer, imgX, imgY, {
                    width: imgWidth,
                    height: imgHeight,
                    fit: [imgWidth, imgHeight],
                    align: 'center',
                    valign: 'center'
                });
                doc.restore();

                nextSectionY += 160; // Add space for image + title + padding
            } catch (err) {
                console.error('Error rendering reward image:', err);
                nextSectionY += 30;
            }
        }

        renderSection(nextSectionY, 'Verification', [
            { label: 'Distributor', value: data.distributor_name || 'Authorized Center' }
        ]);

        // 4. Footer area
        const footerY = doc.page.height - 145;
        doc.strokeColor('#dddddd').lineWidth(0.5)
            .moveTo(startX + 10, footerY + 50).lineTo(startX + 140, footerY + 50).stroke()
            .moveTo(doc.page.width - startX - 140, footerY + 50).lineTo(doc.page.width - startX - 10, footerY + 50).stroke();

        doc.fillColor(secondaryColor).fontSize(11).font('Helvetica')
            .text('Authorized Stamp', startX + 10, footerY + 55, { width: 130, align: 'center', lineBreak: false })
            .text('Customer Signature', doc.page.width - startX - 140, footerY + 55, { width: 130, align: 'center', lineBreak: false });

        const qrSize = 70;
        doc.image(qrCodeBuffer, (doc.page.width - qrSize) / 2, footerY - 35, { width: qrSize });

        // Final verification text (Moved slightly up to be clearly inside border)
        doc.fillColor(secondaryColor).fontSize(9).font('Helvetica')
            .text('Digitally Verified Certificate | Scan QR Code for Details', 0, doc.page.height - 40, { align: 'center', width: doc.page.width, lineBreak: false });

        // 5. Watermark (Absolute center)
        doc.save();
        const midX = doc.page.width / 2;
        const midY = doc.page.height / 2;
        doc.fillColor(primaryColor).opacity(0.04).fontSize(100).font('Helvetica-Bold');
        doc.rotate(-45, { origin: [midX, midY] });
        doc.text('AGRIO INDIA', midX - 250, midY - 60, { width: 500, align: 'center', lineBreak: false });
        doc.restore();

        doc.end();
    });
};
