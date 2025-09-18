const express = require('express');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { 
    title: 'Iniciar Sesión',
    error: null, // Asegurar que error esté definido
    formData: null 
  });
});


router.get('/dashboard', (req, res) => {
  if (!req.session) {
    return res.redirect('/login');
  }
  res.render('dashboard', { 
    title: 'Dashboard',
    user: req.session.user
  });
});

// Página de login
router.get('/login', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { 
    title: 'Iniciar Sesión',
    error: null, // Asegurar que error esté definido
    formData: null 
  });
});

// Página de registro
router.get('/register', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/register', { 
    title: 'Registrarse',
    error: null, // Asegurar que error esté definido
    errors: null, // Asegurar que errors esté definido
    formData: null 
  });
});

// Procesar login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      req.session.user = {
        _id: user._id,
        residenceNumber: user.residenceNumber,
        email: user.email,
        role: user.role
      };
      res.redirect('/dashboard');
    } else {
      res.render('auth/login', {
        title: 'Iniciar Sesión',
        error: 'Email o password inválidos',
        formData: req.body,
        errors: null // Asegurar que errors esté definido
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error del servidor',
      user: null 
    });
  }
});

// Procesar registro
router.post('/register', [
  body('residenceNumber').notEmpty().withMessage('Número de residencia es requerido'),
  body('email').isEmail().withMessage('Email debe ser válido'),
  body('phone').notEmpty().withMessage('Número de teléfono es requerido'),
  body('password').isLength({ min: 6 }).withMessage('Password debe tener al menos 6 caracteres')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).render('auth/register', {
        title: 'Registrarse',
        errors: errors.array(),
        error: null, // Asegurar que error esté definido
        formData: req.body
      });
    }

    const { residenceNumber, email, phone, password } = req.body;

    const userExists = await User.findOne({ 
      $or: [{ email }, { residenceNumber }] 
    });

    if (userExists) {
      return res.status(400).render('auth/register', {
        title: 'Registrarse',
        error: 'Usuario ya existe con ese email o número de residencia',
        errors: null, // Asegurar que errors esté definido
        formData: req.body
      });
    }

    // Verificar si es el primer usuario (se convierte en administrador)
    const userCount = await User.countDocuments();
    const role = userCount === 0 ? 'administrador' : 'residente';

    const user = await User.create({
      residenceNumber,
      email,
      phone,
      password,
      role
    });

    req.session.user = {
      _id: user._id,
      residenceNumber: user.residenceNumber,
      email: user.email,
      role: user.role
    };

    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.status(500).render('error', { 
      message: 'Error del servidor',
      user: null 
    });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router;