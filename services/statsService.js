const Visitor = require('../models/Visitor');
const User = require('../models/User');

class StatsService {
    // Estadísticas generales del sistema
    static async getGeneralStats() {
        try {
            const totalUsers = await User.countDocuments();
            const totalVisitors = await Visitor.countDocuments();
            const visitorsToday = await Visitor.countDocuments({
                visitDate: {
                    $gte: new Date().setHours(0, 0, 0, 0),
                    $lt: new Date().setHours(23, 59, 59, 999)
                }
            });
            const visitedToday = await Visitor.countDocuments({
                visitedAt: {
                    $gte: new Date().setHours(0, 0, 0, 0),
                    $lt: new Date().setHours(23, 59, 59, 999)
                }
            });

            return {
                totalUsers,
                totalVisitors,
                visitorsToday,
                visitedToday,
                pendingToday: visitorsToday - visitedToday
            };
        } catch (error) {
            throw error;
        }
    }

    // Visitantes por día (últimos 30 días)
    static async getVisitorsByDay(days = 30) {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            const stats = await Visitor.aggregate([
                {
                    $match: {
                        visitDate: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$visitDate" } },
                        total: { $sum: 1 },
                        visited: {
                            $sum: { $cond: [{ $ne: ["$visitedAt", null] }, 1, 0] }
                        }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            // Rellenar días sin visitas
            const filledStats = [];
            const currentDate = new Date(startDate);
            const today = new Date();

            while (currentDate <= today) {
                const dateStr = currentDate.toISOString().split('T')[0];
                const dayStats = stats.find(s => s._id === dateStr) || {
                    _id: dateStr,
                    total: 0,
                    visited: 0
                };

                filledStats.push({
                    date: dateStr,
                    total: dayStats.total,
                    visited: dayStats.visited,
                    pending: dayStats.total - dayStats.visited
                });

                currentDate.setDate(currentDate.getDate() + 1);
            }

            return filledStats;
        } catch (error) {
            throw error;
        }
    }

    // Visitantes por residencia (top 10)
    static async getVisitorsByResidence(limit = 10) {
        try {
            const stats = await Visitor.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'residentId',
                        foreignField: '_id',
                        as: 'resident'
                    }
                },
                {
                    $unwind: '$resident'
                },
                {
                    $group: {
                        _id: '$resident.residenceNumber',
                        total: { $sum: 1 },
                        visited: {
                            $sum: { $cond: [{ $ne: ["$visitedAt", null] }, 1, 0] }
                        }
                    }
                },
                {
                    $sort: { total: -1 }
                },
                {
                    $limit: limit
                }
            ]);

            return stats.map(stat => ({
                residence: stat._id,
                total: stat.total,
                visited: stat.visited,
                pending: stat.total - stat.visited
            }));
        } catch (error) {
            throw error;
        }
    }

    // Visitantes por hora del día
    static async getVisitorsByHour() {
        try {
            const stats = await Visitor.aggregate([
                {
                    $group: {
                        _id: { $hour: "$visitTime" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            // Rellenar horas sin visitas
            const filledStats = [];
            for (let hour = 0; hour < 24; hour++) {
                const hourStats = stats.find(s => s._id === hour) || {
                    _id: hour,
                    count: 0
                };
                filledStats.push({
                    hour: `${hour.toString().padStart(2, '0')}:00`,
                    count: hourStats.count
                });
            }

            return filledStats;
        } catch (error) {
            throw error;
        }
    }

    // Estadísticas por mes (últimos 12 meses)
    static async getMonthlyStats() {
        try {
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
            oneYearAgo.setMonth(0, 1);
            oneYearAgo.setHours(0, 0, 0, 0);

            const stats = await Visitor.aggregate([
                {
                    $match: {
                        visitDate: { $gte: oneYearAgo }
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$visitDate" },
                            month: { $month: "$visitDate" }
                        },
                        total: { $sum: 1 },
                        visited: {
                            $sum: { $cond: [{ $ne: ["$visitedAt", null] }, 1, 0] }
                        },
                        withPhotos: {
                            $sum: { $cond: ["$photosUploaded", 1, 0] }
                        }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1 }
                }
            ]);

            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                               'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            return stats.map(stat => ({
                period: `${monthNames[stat._id.month - 1]} ${stat._id.year}`,
                total: stat.total,
                visited: stat.visited,
                withPhotos: stat.withPhotos,
                pending: stat.total - stat.visited
            }));
        } catch (error) {
            throw error;
        }
    }

    // Usuarios por rol
    static async getUsersByRole() {
        try {
            const stats = await User.aggregate([
                {
                    $group: {
                        _id: '$role',
                        count: { $sum: 1 }
                    }
                }
            ]);

            return stats.map(stat => ({
                role: stat._id,
                count: stat.count
            }));
        } catch (error) {
            throw error;
        }
    }
}

module.exports = StatsService;