import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import cropsRoutes from './crops.routes';
import productsRoutes from './products.routes';
import categoriesRoutes from './categories.routes';
import distributorsRoutes from './distributors.routes';
import couponsRoutes from './coupons.routes';
import rewardsRoutes from './rewards.routes';
import searchRoutes from './search.routes';
import supportRoutes from './support.routes';
import notificationsRoutes from './notifications.routes';
import configRoutes from './config.routes';
import fcmRoutes from './fcm.routes';
import adminRoutes from './admin';

import scanRoutes from './scan.routes';

export const apiRouter = Router();

// Public & User Routes
apiRouter.use('/auth', authRoutes);
apiRouter.use('/user', userRoutes);
apiRouter.use('/users', userRoutes); // Alias for plural convenience

apiRouter.use('/crops', cropsRoutes);
apiRouter.use('/products', productsRoutes);
apiRouter.use('/categories', categoriesRoutes);
apiRouter.use('/distributors', distributorsRoutes);
apiRouter.use('/coupons', couponsRoutes);
apiRouter.use('/rewards', rewardsRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/support', supportRoutes);
apiRouter.use('/notifications', notificationsRoutes);
apiRouter.use('/config', configRoutes);
apiRouter.use('/fcm', fcmRoutes);
apiRouter.use('/configs', configRoutes); // Plural alias
apiRouter.use('/banners', configRoutes);
apiRouter.use('/pages', supportRoutes);
apiRouter.use('/scan', scanRoutes);

// Admin Routes
apiRouter.use('/admin', adminRoutes);

export default apiRouter;

