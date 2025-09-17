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

module.exports = router;