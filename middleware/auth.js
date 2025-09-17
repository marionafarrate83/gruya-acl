const User = require('../models/User');

const protect = async (req, res, next) => {
  if (req.session.user) {
    try {
      req.user = await User.findById(req.session.user._id).select('-password');
      next();
    } catch (error) {
      console.error(error);
      res.redirect('/auth/login');
    }
  } else {
    res.redirect('/auth/login');
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'administrador') {
    next();
  } else {
    res.status(403).render('error', { 
      message: 'Acceso denegado. Se requiere rol de administrador' 
    });
  }
};

const guard = (req, res, next) => {
  if (req.user && (req.user.role === 'guardia' || req.user.role === 'administrador')) {
    next();
  } else {
    res.status(403).render('error', { 
      message: 'Acceso denegado. Se requiere rol de guardia o administrador' 
    });
  }
};

module.exports = { protect, admin, guard };