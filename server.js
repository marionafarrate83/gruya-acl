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
mongoose.connect(process.env.MONGODB_URI)
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
  saveUninitialized: true,
  cookie: { secure: true }
}))

// Middleware para pasar user a las vistas
app.use((req, res, next) => {
  res.locals.error = null;
  res.locals.errors = null;
  res.locals.formData = null;
  res.locals.user = req.session.user;
  next();
});

// Rutas
app.use('/', authRoutes);
app.use('/users', userRoutes);
app.use('/visitors', visitorRoutes);

// Iniciar servidor
const PORT = process.env.PORT;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en puerto ${PORT}`);
});