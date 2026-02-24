import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import axios from 'axios';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { generateRewardCertificate } from '../utils/pdfGenerator';
import { uploadBufferToCloudinary } from '../utils/cloudinary';

// GET /api/v1/rewards/:id/certificate
export const getRewardCertificate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const redemption = await prisma.scanRedemption.findUnique({
      where: { id },
    });

    if (!redemption) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Reward not found', 404);
    }

    // Verify ownership
    if (redemption.userId !== userId) {
      return sendError(res, ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    // We now redirect to a dedicated PDF serving route for direct view/download
    // This avoids Cloudinary redirect and corruption issues
    const pdfUrl = `/api/v1/rewards/${id}/certificate/pdf`;

    return sendSuccess(res, {
      certificate_url: pdfUrl,
      download_url: pdfUrl,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/rewards/:id/certificate/pdf
export const getRewardCertificatePdf = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;
    console.log(`[PDF] Request received for ID: ${id} by User: ${userId}`);

    const redemption = await prisma.scanRedemption.findUnique({
      where: { id },
      include: {
        coupon: { select: { code: true } },
        productCoupon: { select: { serialNumber: true, authCode: true } },
        tier: true,
        user: { select: { fullName: true, phoneNumber: true, fullAddress: true } },
        distributor: { select: { businessName: true } },
      },
    });

    if (!redemption) {
      console.error(`[PDF] Redemption record not found for ID: ${id}`);
      return res.status(404).json({ error: 'Reward not found' });
    }

    if (redemption.userId !== userId) {
      console.error(`[PDF] Unauthorized access attempt: User ${userId} requested reward ${id} owned by ${redemption.userId}`);
      return res.status(403).json({ error: 'Access denied' });
    }

    const prizeName = redemption.tier?.rewardName ||
      (redemption.prizeType === 'GIFT' ? 'Agrio Reward' : `₹${redemption.prizeValue} ${redemption.prizeType}`);

    console.log(`[PDF] Calling generator for: ${redemption.user.fullName}`);
    const pdfBuffer = await generateRewardCertificate({
      winner_name: redemption.user.fullName || 'Valued Farmer',
      phone_number: redemption.user.phoneNumber,
      full_address: redemption.user.fullAddress || '',
      prize_name: prizeName,
      coupon_code: redemption.coupon?.code || redemption.productCoupon?.serialNumber || 'N/A',
      won_date: redemption.scannedAt,
      verification_id: redemption.id,
      rank: redemption.assignedRank?.toString(),
      distributor_name: redemption.distributor?.businessName,
      serial_number: redemption.productCoupon?.serialNumber,
      auth_code: redemption.productCoupon?.authCode,
      reward_image_url: redemption.tier?.imageUrl || undefined,
    });

    console.log(`[PDF] PDF generated successfully. Buffer size: ${pdfBuffer.length} bytes`);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Content-Disposition', `inline; filename="acknowledgment_${id}.pdf"`);
    res.end(pdfBuffer, 'binary');

    // Optional: Also sync to Cloudinary in background for record keeping
    if (!redemption.acknowledgmentFileUrl) {
      uploadBufferToCloudinary(pdfBuffer, 'reward_certificates', `acknowledgment_${id}`)
        .then((result: any) => {
          prisma.scanRedemption.update({
            where: { id: redemption.id },
            data: { acknowledgmentFileUrl: result.url }
          }).catch(console.error);
        }).catch(console.error);
    }
  } catch (error) {
    next(error);
  }
};

