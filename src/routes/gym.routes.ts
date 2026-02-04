import { Router } from 'express';
import * as gymController from '../controllers/gym.controller';
import { gymAuthenticate } from '../middleware/gymAuth';

const router = Router();

// Public routes
router.post('/auth/google', gymController.googleAuth);

// Protected routes (require Firebase authentication)
router.get('/workout-plans', gymAuthenticate, gymController.getWorkoutPlans);
router.post('/workout-plans', gymAuthenticate, gymController.createWorkoutPlan);
router.put('/workout-plans/:id', gymAuthenticate, gymController.updateWorkoutPlan);
router.delete('/workout-plans/:id', gymAuthenticate, gymController.deleteWorkoutPlan);

router.get('/availabilities', gymAuthenticate, gymController.getAvailabilities);
router.post('/availabilities', gymAuthenticate, gymController.createAvailability);
router.delete('/availabilities/:id', gymAuthenticate, gymController.deleteAvailability);

router.get('/bookings', gymAuthenticate, gymController.getBookings);
router.post('/bookings', gymAuthenticate, gymController.createBooking);
router.put('/bookings/:id', gymAuthenticate, gymController.updateBooking);
router.delete('/bookings/:id', gymAuthenticate, gymController.deleteBooking);

export default router;
