const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const {errorHandler} = require('./middleware/errorHandler');

//Importar rutas 
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const categoryRoutes = require('./routes/category.routes');
const orderRoutes = require('./routes/order.routes');
const creditRoutes = require('./routes/credit.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const weeklyMenuRoutes = require('./routes/weeklyMenu.routes');

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Limitar cada IP a 100 solicitudes por ventana
    message: 'Demasiadas peticiones desde esta IP, intenta mas tarde.'
});

app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if(process.env.NODE_ENV === 'development'){
    app.use(require('morgan')('dev'));
    app.use(require('errorhandler')());
    app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}

app.get('/health', (req,res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/credits', creditRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/weekly-menus', weeklyMenuRoutes);

// CORREGIDO: Middleware sin patrón de ruta para catch-all
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint no encontrado'
    });
});

app.use(errorHandler);

module.exports = app;