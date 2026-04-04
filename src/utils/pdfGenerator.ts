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
    certificate_number?: string | number | bigint;
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

        // 1. Header (Pushed down to clear the logo's lower peak)
        doc.fillColor(primaryColor).fontSize(22).font('Helvetica-Bold').text('CERTIFICATE OF WINNING', 0, 175, { align: 'center', width: doc.page.width, lineBreak: false });
        doc.fillColor(secondaryColor).fontSize(13).font('Helvetica').text('Agrio India Crop Science', 0, 205, { align: 'center', width: doc.page.width, lineBreak: false });

        doc.strokeColor('#eeeeee').lineWidth(0.5).moveTo(80, 230).lineTo(doc.page.width - 80, 230).stroke();

        // 3. Details Sections 
        const startX = 60;
        const contentWidth = doc.page.width - (startX * 2);

        const renderSection = (yStart: number, title: string, items: { label: string, value: string }[]) => {
            doc.rect(startX, yStart, contentWidth, 22).fill('#f1f5f1');
            doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
                .text(title.toUpperCase(), startX + 15, yStart + 6, { characterSpacing: 1, lineBreak: false });

            let y = yStart + 32;
            items.forEach(item => {
                doc.fillColor(secondaryColor).fontSize(11).font('Helvetica').text(item.label, startX + 15, y, { lineBreak: false });
                doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold').text(item.value || '-', startX + 180, y, { align: 'right', width: contentWidth - 180 - 15, lineBreak: true });
                y += 18;
            });
        };

        // Format date
        const { format } = require('date-fns');
        const formattedDate = format(new Date(new Date(data.won_date).getTime() + 5.5 * 60 * 60 * 1000), 'dd MMM yyyy, hh:mm a');

        // 2. Personal Details
        renderSection(245, 'User Details', [
            { label: 'Winner Name', value: data.winner_name },
            { label: 'Phone Number', value: data.phone_number },
            { label: 'Address', value: data.full_address || 'Profile incomplete' }
        ]);

        // Prize Details
        renderSection(345, 'Prize Details', [
            { label: 'Reward Item', value: data.prize_name },
            { label: 'Coupon Code', value: data.auth_code || data.coupon_code },
            { label: 'Serial Number', value: data.serial_number || '-' },
            { label: 'Batch No', value: data.certificate_number?.toString() || '-' },
            { label: 'Scan Date', value: formattedDate }
        ]);

        // Reward Image Section
        let nextSectionY = 465;
        if (rewardImageBuffer) {
            doc.rect(startX, nextSectionY, contentWidth, 22).fill('#f1f5f1');
            doc.fillColor(primaryColor).fontSize(11).font('Helvetica-Bold')
                .text('REWARD PREVIEW', startX + 15, nextSectionY + 6, { characterSpacing: 1, lineBreak: false });

            try {
                const containerWidth = 140;
                const containerHeight = 100;
                const containerX = (doc.page.width - containerWidth) / 2;
                const containerY = nextSectionY + 35;
                const radius = 10;
                
                // 1. Draw Container (White background with subtle shadow feel)
                doc.fillColor('#ffffff').roundedRect(containerX, containerY, containerWidth, containerHeight, radius).fill();
                doc.strokeColor('#e5e7eb').lineWidth(0.5).roundedRect(containerX, containerY, containerWidth, containerHeight, radius).stroke();

                // 2. Clip and Draw Image (Centered with breathing room)
                doc.save();
                const imgPadding = 8;
                const imgWidth = containerWidth - (imgPadding * 2);
                const imgHeight = containerHeight - (imgPadding * 2);
                const imgX = containerX + imgPadding;
                const imgY = containerY + imgPadding;

                doc.roundedRect(imgX, imgY, imgWidth, imgHeight, radius - 2).clip();
                doc.image(rewardImageBuffer, imgX, imgY, { 
                    width: imgWidth, 
                    height: imgHeight, 
                    fit: [imgWidth, imgHeight],
                    align: 'center',
                    valign: 'center'
                });
                doc.restore();

                nextSectionY += 140;
            } catch (err) {
                console.error('Error rendering reward image:', err);
                nextSectionY += 30;
            }
        }

        // 4. Verification Section
        renderSection(nextSectionY + 10, 'Verification', [
            { label: 'Distributor', value: data.distributor_name || 'Authorized Center' }
        ]);

        // 5. QR Code and Footer Layout
        const footerY = doc.page.height - 90;
        
        // QR Code perfectly centered
        const qrSize = 70;
        const qrX = (doc.page.width - qrSize) / 2;
        const qrY = footerY - 80; 
        doc.image(qrCodeBuffer, qrX, qrY, { width: qrSize });

        // Signature lines
        doc.strokeColor('#dddddd').lineWidth(1)
            .moveTo(startX, footerY + 25).lineTo(startX + 140, footerY + 25).stroke()
            .moveTo(doc.page.width - startX - 140, footerY + 25).lineTo(doc.page.width - startX, footerY + 25).stroke();

        doc.fillColor(secondaryColor).fontSize(10).font('Helvetica')
            .text('Authorized Stamp', startX, footerY + 32, { width: 140, align: 'center', lineBreak: false })
            .text('Customer Signature', doc.page.width - startX - 140, footerY + 32, { width: 140, align: 'center', lineBreak: false });

        // Final footer text
        doc.fillColor(secondaryColor).fontSize(8).font('Helvetica')
            .text('Digitally Verified Certificate | Scan QR Code for Details', 0, doc.page.height - 25, { align: 'center', width: doc.page.width, lineBreak: false });

        // 6. Watermark (Absolute center)
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
