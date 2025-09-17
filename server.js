const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

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
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 día
}))

// Middleware para pasar user a las vistas
app.use(async (req, res, next) => {
  res.locals.error = null;
  res.locals.errors = null;
  res.locals.formData = null;
  // Cargar usuario si está autenticado
  if (req.session.userId) {
    try {
      const user = await req.db.collection('users').findOne({ _id: new ObjectId(req.session.userId) });
      res.locals.user = user || null;
    } catch (err) {
      console.error('Error al obtener el usuario:', err);
      res.locals.user = null;
    }
  } else {
    res.locals.user = null;
  }  
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