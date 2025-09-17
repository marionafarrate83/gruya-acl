const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');

// Cargar variables de entorno
dotenv.config();

// Importar rutas (asegúrate de que las rutas estén correctamente exportadas)
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const visitorRoutes = require('./routes/visitors');

// Inicializar aplicación Express
const app = express();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  //useNewUrlParser: true,
  //useUnifiedTopology: true
})
.then(() => console.log('Conectado a MongoDB'))
.catch(err => console.log('Error conectando a MongoDB:', err));

// Configuración de middleware
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session middleware
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false//,
  //cookie: { secure: true } // Cambiar a true en producción con HTTPS
}));

// Middleware para pasar user a las vistas
app.use((req, res, next) => {
  res.locals.error = null;
  res.locals.errors = null;
  res.locals.formData = null;
  res.locals.user = req.session.user;
  next();
});

// Rutas
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/visitors', visitorRoutes);

// Ruta principal
app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/dashboard');
  }
  res.render('auth/login', { title: 'Iniciar Sesión' });
});

// Dashboard
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/auth/login');
  }
  res.render('dashboard', { 
    title: 'Dashboard',
    user: req.session.user 
  });
});

// Logout
app.get('/auth/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Iniciar servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});