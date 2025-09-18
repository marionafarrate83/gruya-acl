const express = require('express');
const { protect, admin, guard } = require('../middleware/auth');
const Visitor = require('../models/Visitor');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Vista de visitantes del día (para guardias y administradores)
router.get('/', protect, guard, async (req, res) => {
  try {
    let today = new Date();
    today.setDate(today.getDate()-1);
    today.setUTCHours(0, 0, 0, 0);
    console.log("today " + today); // "2025-09-16T00:00:00.000+00:00"

    // Formatear al formato deseado
    const formatted = today.toISOString().replace('Z', '+00:00');
    console.log("formatted " + formatted); // "2025-09-16T00:00:00.000+00:00"

    //const tomorrow = new Date(today);
    //tomorrow.setDate(tomorrow.getDate() + 1);

    const visitors = await Visitor.find({
      visitDate: {
        $eq: formatted
      }
    }).populate('residentId', 'residenceNumber');

    console.log("visitantes" + visitors)

    res.render('visitors/index', {
      title: 'Visitantes de Hoy',
      visitors,
      user: req.user,
      currentDate: today
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Historial de visitantes (para residentes)
router.get('/history', protect, async (req, res) => {
  try {
    const visitors = await Visitor.find({ residentId: req.user._id })
      .sort({ createdAt: -1 });

    res.render('visitors/history', {
      title: 'Mi Historial de Visitantes',
      visitors,
      user: req.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Formulario para registrar visitante
router.get('/create', protect, (req, res) => {
  res.render('visitors/create', {
    title: 'Registrar Visitante',
    user: req.user
  });
});

// Registrar nuevo visitante
router.post('/create', protect, [
  body('visitorName').notEmpty().withMessage('Nombre del visitante es requerido'),
  body('visitDate').notEmpty().withMessage('Fecha de visita es requerida'),
  body('visitTime').notEmpty().withMessage('Hora de visita es requerida'),
  body('visitReason').notEmpty().withMessage('Motivo de visita es requerido'),
  body('visitorPhone').notEmpty().withMessage('Teléfono del visitante es requerido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('visitors/create', {
        title: 'Registrar Visitante',
        user: req.user,
        errors: errors.array(),
        formData: req.body
      });
    }

    const { visitorName, visitDate, visitTime, visitReason, visitorPhone } = req.body;

    const visitor = await Visitor.create({
      visitorName,
      visitDate,
      visitTime,
      visitReason,
      visitorPhone,
      residentId: req.user._id
    });

    // Generar código QR
    const qrCodeData = await QRCode.toDataURL(visitor.visitId);

    res.render('visitors/created', {
      title: 'Visitante Registrado',
      user: req.user,
      visitor,
      qrCodeData
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Compartir por WhatsApp
router.get('/share/:id/whatsapp', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor || visitor.residentId.toString() !== req.user._id.toString()) {
      return res.status(404).render('error', { message: 'Visitante no encontrado' });
    }

    const message = `Hola, tu código de acceso para visitar el condominio es: ${visitor.visitId}. Por favor preséntalo en la entrada. - ${visitor.visitorName}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    res.redirect(whatsappUrl);
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Ver QR de visitante existente
router.get('/:id/qr', protect, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor || visitor.residentId.toString() !== req.user._id.toString()) {
      return res.status(404).render('error', { 
        message: 'Visitante no encontrado',
        user: req.user 
      });
    }

    // Generar código QR
    const qrCodeData = await QRCode.toDataURL(visitor.visitId);

    res.render('visitors/view-qr', {
      title: 'Código QR del Visitante',
      user: req.user,
      visitor,
      qrCodeData
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error del servidor',
      user: req.user 
    });
  }
});

// Ruta para la página de escaneo
router.get('/scan', protect, guard, (req, res) => {
    res.render('visitors/scan', {
        title: 'Escanear Código QR',
        user: req.user
    });
});

// API: Verificar código QR
router.post('/api/verify', protect, guard, async (req, res) => {
    try {
        console.log("ya estoy en verify")
        const { visitId } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const visitor = await Visitor.findOne({
            visitId: visitId.trim(),
            visitDate: {
                $gte: today,
                $lt: tomorrow
            }
        }).populate('residentId', 'residenceNumber');

        if (!visitor) {
            return res.json({
                success: false,
                message: 'Código no válido o expirado'
            });
        }

        res.json({
            success: true,
            visitor: {
                _id: visitor._id,
                visitId: visitor.visitId,
                visitorName: visitor.visitorName,
                visitDate: visitor.visitDate,
                visitTime: visitor.visitTime,
                visitReason: visitor.visitReason,
                visitorPhone: visitor.visitorPhone,
                residentId: visitor.residentId,
                visitedAt: visitor.visitedAt
            }
        });

    } catch (error) {
        console.error('Error verificando código:', error);
        res.status(500).json({
            success: false,
            message: 'Error del servidor'
        });
    }
});

// API: Obtener visitantes de hoy
router.get('/api/today', protect, guard, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const visitors = await Visitor.find({
            visitDate: {
                $gte: today,
                $lt: tomorrow
            }
        }).populate('residentId', 'residenceNumber')
          .sort({ createdAt: -1 });

        res.json(visitors);
    } catch (error) {
        console.error('Error obteniendo visitantes:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Obtener detalles de visitante
router.get('/api/:id', protect, guard, async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id)
            .populate('residentId', 'residenceNumber email phone');

        if (!visitor) {
            return res.status(404).json({ error: 'Visitante no encontrado' });
        }

        res.json(visitor);
    } catch (error) {
        console.error('Error obteniendo visitante:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Marcar como visitado
router.post('/api/:id/visit', protect, guard, async (req, res) => {
    try {
        const visitor = await Visitor.findByIdAndUpdate(
            req.params.id,
            { visitedAt: new Date() },
            { new: true }
        );

        if (!visitor) {
            return res.status(404).json({ error: 'Visitante no encontrado' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error marcando como visitado:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});



module.exports = router;