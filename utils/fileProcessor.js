const xlsx = require('xlsx');
const csv = require('csv-parser');
const fs = require('fs');
const User = require('../models/User');

class FileProcessor {
  static async processExcel(filePath) {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  }

  static async processCSV(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => resolve(results))
        .on('error', (error) => reject(error));
    });
  }

  static validateRow(row, index) {
    const errors = [];
    
    // Validar campos requeridos
    if (!row.residenceNumber) {
      errors.push(`Fila ${index}: Número de residencia es requerido`);
    }
    
    if (!row.email) {
      errors.push(`Fila ${index}: Email es requerido`);
    } else if (!this.isValidEmail(row.email)) {
      errors.push(`Fila ${index}: Email inválido`);
    }
    
    if (!row.phone) {
      errors.push(`Fila ${index}: Teléfono es requerido`);
    }

    // Validar formato de roles
    if (row.role && !['residente', 'guardia', 'administrador'].includes(row.role.toLowerCase())) {
      errors.push(`Fila ${index}: Rol inválido. Debe ser: residente, guardia o administrador`);
    }

    return errors;
  }

  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static generateRandomPassword() {
    return Math.random().toString(36).slice(-8) + 'A1!';
  }

  static async processBulkUpload(rows, requesterId) {
    const results = {
      total: rows.length,
      success: 0,
      errors: [],
      duplicates: 0,
      skipped: 0
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 porque la primera fila es encabezado y i empieza en 0

      try {
        // Validar fila
        const validationErrors = this.validateRow(row, rowNumber);
        if (validationErrors.length > 0) {
          results.errors.push(...validationErrors);
          results.skipped++;
          continue;
        }

        // Verificar si ya existe
        const existingUser = await User.findOne({
          $or: [
            { email: row.email.toLowerCase().trim() },
            { residenceNumber: row.residenceNumber.trim() }
          ]
        });

        if (existingUser) {
          results.duplicates++;
          results.errors.push(`Fila ${rowNumber}: Usuario ya existe (Email: ${row.email}, Residencia: ${row.residenceNumber})`);
          continue;
        }

        // Crear usuario
        const userData = {
          residenceNumber: row.residenceNumber.trim(),
          email: row.email.toLowerCase().trim(),
          phone: row.phone.trim(),
          password: row.password || this.generateRandomPassword(),
          role: (row.role || 'residente').toLowerCase()
        };

        await User.create(userData);
        results.success++;

      } catch (error) {
        results.errors.push(`Fila ${rowNumber}: Error - ${error.message}`);
        results.skipped++;
      }
    }

    return results;
  }
}

module.exports = FileProcessor;