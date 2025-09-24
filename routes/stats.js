const express = require('express');
const { protect, admin } = require('../middleware/auth');
const StatsService = require('../services/statsService');
const router = express.Router();

router.get('/dashboard', protect, admin, async (req, res) => {
    try {
        const generalStats = await StatsService.getGeneralStats();
        const visitorsByDay = await StatsService.getVisitorsByDay(30);
        const visitorsByResidence = await StatsService.getVisitorsByResidence(10);
        const monthlyStats = await StatsService.getMonthlyStats();
        const usersByRole = await StatsService.getUsersByRole();

        console.log('Datos cargados:', {
            generalStats,
            visitorsByDayCount: visitorsByDay.length,
            visitorsByResidenceCount: visitorsByResidence.length,
            monthlyStatsCount: monthlyStats.length,
            usersByRoleCount: usersByRole.length
        });

        res.render('admin/dashboard', {
            title: 'Dashboard Administrativo',
            user: req.user,
            generalStats,
            visitorsByDay,
            visitorsByResidence,
            monthlyStats,
            usersByRole
        });

    } catch (error) {
        console.error('Error cargando dashboard:', error);
        res.status(500).render('error', {
            message: 'Error cargando estadísticas',
            user: req.user
        });
    }
});

// API para datos de gráficas (AJAX)
router.get('/api/visitors-by-day', protect, admin, async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const data = await StatsService.getVisitorsByDay(days);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/visitors-by-residence', protect, admin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const data = await StatsService.getVisitorsByResidence(limit);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/monthly-stats', protect, admin, async (req, res) => {
    try {
        const data = await StatsService.getMonthlyStats();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/api/users-by-role', protect, admin, async (req, res) => {
    try {
        const data = await StatsService.getUsersByRole();
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;