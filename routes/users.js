const express = require('express');
const { protect, admin } = require('../middleware/auth');
const User = require('../models/User');
const { body, validationResult } = require('express-validator'); // Importar body y validationResult
const router = express.Router();
const upload = require('../middleware/upload');
const FileProcessor = require('../utils/fileProcessor');
const fs = require('fs');
const path = require('path');

// Rutas para usuarios (solo administradores)
router.get('/', protect, admin, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.render('users/index', { 
      title: 'Gestión de Usuarios',
      users,
      user: req.user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Obtener formulario para crear usuario
router.get('/create', protect, admin, (req, res) => {
  res.render('users/create', { 
    title: 'Crear Usuario',
    user: req.user
  });
});

// Crear nuevo usuario
router.post('/create', protect, admin, [
  body('residenceNumber').notEmpty().withMessage('Número de residencia es requerido'),
  body('email').isEmail().withMessage('Email debe ser válido'),
  body('phone').notEmpty().withMessage('Número de teléfono es requerido'),
  body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres'),
  body('role').isIn(['residente', 'guardia', 'administrador']).withMessage('Rol no válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('users/create', {
        title: 'Crear Usuario',
        user: req.user,
        errors: errors.array(),
        formData: req.body
      });
    }

    const { residenceNumber, email, phone, password, role } = req.body;

    const userExists = await User.findOne({ 
      $or: [{ email }, { residenceNumber }] 
    });

    if (userExists) {
      return res.status(400).render('users/create', {
        title: 'Crear Usuario',
        user: req.user,
        error: 'Usuario ya existe con ese email o número de residencia',
        formData: req.body
      });
    }

    await User.create({
      residenceNumber,
      email,
      phone,
      password,
      role
    });

    res.redirect('/users');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Obtener formulario para editar usuario
router.get('/edit/:id', protect, admin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).render('error', { message: 'Usuario no encontrado' });
    }

    res.render('users/edit', {
      title: 'Editar Usuario',
      user: req.user,
      editUser: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Actualizar usuario
router.post('/edit/:id', protect, admin, [
  body('residenceNumber').notEmpty().withMessage('Número de residencia es requerido'),
  body('email').isEmail().withMessage('Email debe ser válido'),
  body('phone').notEmpty().withMessage('Número de teléfono es requerido'),
  body('role').isIn(['residente', 'guardia', 'administrador']).withMessage('Rol no válido')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const editUser = await User.findById(req.params.id).select('-password');
      return res.status(400).render('users/edit', {
        title: 'Editar Usuario',
        user: req.user,
        editUser,
        errors: errors.array()
      });
    }

    const { residenceNumber, email, phone, role } = req.body;

    // Verificar si el email o número de residencia ya existen en otros usuarios
    const existingUser = await User.findOne({
      _id: { $ne: req.params.id },
      $or: [{ email }, { residenceNumber }]
    });

    if (existingUser) {
      const editUser = await User.findById(req.params.id).select('-password');
      return res.status(400).render('users/edit', {
        title: 'Editar Usuario',
        user: req.user,
        editUser,
        error: 'Email o número de residencia ya existe en otro usuario'
      });
    }

    await User.findByIdAndUpdate(req.params.id, {
      residenceNumber,
      email,
      phone,
      role
    });

    res.redirect('/users');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Eliminar usuario
router.post('/delete/:id', protect, admin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.redirect('/users');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { message: 'Error del servidor' });
  }
});

// Ruta para mostrar el formulario de carga masiva
router.get('/bulk-upload', protect, admin, (req, res) => {
  res.render('users/bulk-upload', {
    title: 'Carga Masiva de Usuarios',
    user: req.user
  });
});

// Ruta para descargar plantilla
router.get('/download-template', protect, admin, (req, res) => {
  const filePath = path.join(__dirname, '../public/templates/plantilla-residentes.csv');
  res.download(filePath, 'plantilla-residentes-condominio.csv');
});

// Ruta para procesar carga masiva
router.post('/bulk-upload', protect, admin, upload.single('usersFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).render('users/bulk-upload', {
        title: 'Carga Masiva de Usuarios',
        user: req.user,
        error: 'Por favor seleccione un archivo'
      });
    }

    let rows = [];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    // Procesar según el tipo de archivo
    if (fileExtension === '.csv') {
      rows = await FileProcessor.processCSV(req.file.path);
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      rows = await FileProcessor.processExcel(req.file.path);
    } else {
      throw new Error('Formato de archivo no soportado');
    }

    if (rows.length === 0) {
      throw new Error('El archivo está vacío o no contiene datos válidos');
    }

    // Procesar los datos
    const results = await FileProcessor.processBulkUpload(rows, req.user._id);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.render('users/bulk-upload-result', {
      title: 'Resultado de Carga Masiva',
      user: req.user,
      results: results
    });

  } catch (error) {
    // Limpiar archivo en caso de error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).render('users/bulk-upload', {
      title: 'Carga Masiva de Usuarios',
      user: req.user,
      error: `Error procesando archivo: ${error.message}`
    });
  }
});

// API para carga masiva (para AJAX)
router.post('/api/bulk-upload', protect, admin, upload.single('usersFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se seleccionó ningún archivo' });
    }

    let rows = [];
    const fileExtension = path.extname(req.file.originalname).toLowerCase();

    if (fileExtension === '.csv') {
      rows = await FileProcessor.processCSV(req.file.path);
    } else if (['.xlsx', '.xls'].includes(fileExtension)) {
      rows = await FileProcessor.processExcel(req.file.path);
    }

    const results = await FileProcessor.processBulkUpload(rows, req.user._id);

    // Limpiar archivo temporal
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;