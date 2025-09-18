const express = require('express');
const { protect, admin, guard } = require('../middleware/auth');
const Visitor = require('../models/Visitor');
const QRCode = require('qrcode');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const PDFService = require('../services/pdfService');

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

// Configurar multer para memoria (no guardar archivos en disco)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB límite
  }
});

// API: Subir fotos para un visitante
router.post('/api/:id/upload-photos', protect, guard, upload.array('photos', 2), async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({ error: 'Visitante no encontrado' });
    }

    // Subir fotos a Cloudinary
    const uploadPromises = req.files.map(file => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'condominio/visitors',
            public_id: `visit_${visitor.visitId}_${Date.now()}`,
            transformation: [
              { width: 800, height: 600, crop: 'limit' },
              { quality: 'auto' },
              { format: 'jpg' }
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        stream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    
    // Guardar URLs en la base de datos
    visitor.photos = results.map(result => ({
      url: result.secure_url,
      public_id: result.public_id
    }));
    
    visitor.photosUploaded = true;
    await visitor.save();

    res.json({
      success: true,
      message: 'Fotos subidas correctamente',
      photos: visitor.photos
    });

  } catch (error) {
    console.error('Error subiendo fotos:', error);
    res.status(500).json({ error: 'Error subiendo fotos' });
  }
});

// API: Obtener fotos de un visitante
router.get('/api/:id/photos', protect, guard, async (req, res) => {
  try {
    const visitor = await Visitor.findById(req.params.id);
    
    if (!visitor) {
      return res.status(404).json({ error: 'Visitante no encontrado' });
    }

    res.json({
      photos: visitor.photos,
      photosUploaded: visitor.photosUploaded
    });

  } catch (error) {
    console.error('Error obteniendo fotos:', error);
    res.status(500).json({ error: 'Error obteniendo fotos' });
  }
});

// Ruta para administración de visitantes
router.get('/admin', protect, admin, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Construir filtros
        let filter = {};
        
        // Filtro de búsqueda general
        if (req.query['search-term']) {
            const searchTerm = req.query['search-term'];
            filter.$or = [
                { visitorName: { $regex: searchTerm, $options: 'i' } },
                { visitId: { $regex: searchTerm, $options: 'i' } },
                { visitReason: { $regex: searchTerm, $options: 'i' } },
                { 'residentId.residenceNumber': { $regex: searchTerm, $options: 'i' } }
            ];
        }

        // Filtro por fecha
        if (req.query['date-from'] || req.query['date-to']) {
            filter.visitDate = {};
            if (req.query['date-from']) {
                filter.visitDate.$gte = new Date(req.query['date-from']);
            }
            if (req.query['date-to']) {
                const toDate = new Date(req.query['date-to']);
                toDate.setHours(23, 59, 59, 999);
                filter.visitDate.$lte = toDate;
            }
        }

        // Filtro por estado de visita
        if (req.query['visit-status'] === 'visited') {
            filter.visitedAt = { $exists: true, $ne: null };
        } else if (req.query['visit-status'] === 'not-visited') {
            filter.visitedAt = { $exists: false };
        }

        // Filtro por fotos
        if (req.query['photos-status'] === 'with-photos') {
            filter.photosUploaded = true;
        } else if (req.query['photos-status'] === 'without-photos') {
            filter.photosUploaded = false;
        }

        const total = await Visitor.countDocuments(filter);
        const visitors = await Visitor.find(filter)
            .populate('residentId', 'residenceNumber email phone')
            .sort({ visitDate: -1, createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(total / limit);

        res.render('visitors/admin', {
            title: 'Administrar Visitantes',
            user: req.user,
            visitors,
            currentPage: page,
            totalPages,
            total,
            queryString: new URLSearchParams(req.query).toString()
        });

    } catch (error) {
        console.error('Error en administración de visitantes:', error);
        res.status(500).render('error', { 
            message: 'Error del servidor',
            user: req.user 
        });
    }
});

// API: Obtener detalles completos para admin
router.get('/api/:id/admin', protect, admin, async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id)
            .populate('residentId', 'residenceNumber email phone');

        if (!visitor) {
            return res.status(404).json({ error: 'Visitante no encontrado' });
        }

        res.json(visitor);
    } catch (error) {
        console.error('Error obteniendo detalles:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// API: Eliminar visita
router.delete('/api/:id', protect, admin, async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id);
        
        if (!visitor) {
            return res.status(404).json({ error: 'Visitante no encontrado' });
        }

        // Eliminar fotos de Cloudinary si existen
        if (visitor.photosUploaded && visitor.photos.length > 0) {
            const deletePromises = visitor.photos.map(photo => 
                cloudinary.uploader.destroy(photo.public_id)
            );
            await Promise.all(deletePromises);
        }

        await Visitor.findByIdAndDelete(req.params.id);

        res.json({ success: true });
    } catch (error) {
        console.error('Error eliminando visita:', error);
        res.status(500).json({ error: 'Error del servidor' });
    }
});

// Ruta para generar y descargar PDF
router.get('/:id/pdf', protect, async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id)
            .populate('residentId', 'residenceNumber email phone');

        if (!visitor) {
            return res.status(404).render('error', {
                message: 'Visitante no encontrado',
                user: req.user
            });
        }

        // Verificar que el usuario tiene permisos
        if (req.user.role === 'residente' && visitor.residentId._id.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                message: 'No tienes permisos para ver este documento',
                user: req.user
            });
        }

        // Generar PDF
        const pdfInfo = await PDFService.generateVisitPDF(visitor, visitor.residentId);

        // Configurar headers para descarga
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="visita-${visitor.visitId}.pdf"`);

        // Enviar archivo
        res.sendFile(pdfInfo.filePath);

        // Limpiar archivos antiguos
        PDFService.cleanupOldFiles();

    } catch (error) {
        console.error('Error generando PDF:', error);
        res.status(500).render('error', {
            message: 'Error generando el documento PDF',
            user: req.user
        });
    }
});

// Ruta para ver PDF en el navegador
router.get('/:id/view-pdf', protect, async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id)
            .populate('residentId', 'residenceNumber email phone');

        if (!visitor) {
            return res.status(404).render('error', {
                message: 'Visitante no encontrado',
                user: req.user
            });
        }

        if (req.user.role === 'residente' && visitor.residentId._id.toString() !== req.user._id.toString()) {
            return res.status(403).render('error', {
                message: 'No tienes permisos para ver este documento',
                user: req.user
            });
        }

        const pdfInfo = await PDFService.generateVisitPDF(visitor, visitor.residentId);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="visita-${visitor.visitId}.pdf"`);

        res.sendFile(pdfInfo.filePath);

        PDFService.cleanupOldFiles();

    } catch (error) {
        console.error('Error mostrando PDF:', error);
        res.status(500).render('error', {
            message: 'Error mostrando el documento PDF',
            user: req.user
        });
    }
});

module.exports = router;