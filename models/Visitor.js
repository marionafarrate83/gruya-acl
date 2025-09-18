const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  visitorName: {
    type: String,
    required: true
  },
  visitDate: {
    type: Date,
    required: true
  },
  visitTime: {
    type: String,
    required: true
  },
  visitReason: {
    type: String,
    required: true
  },
  visitorPhone: {
    type: String,
    required: true
  },
  visitId: {
    type: String,
    unique: true
  },
  residentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  visitedAt: {
        type: Date,
        default: null
  }
});

// Generar ID de visita antes de guardar
visitorSchema.pre('save', function(next) {
  if (!this.visitId) {
    this.visitId = 'VIS' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Visitor', visitorSchema);