const XLSX = require('xlsx');
const User = require('../models/User');
const { transaction } = require('../config/database');

class ExcelImportService {
  /**
   * Validar estructura del archivo Excel
   */
  static validateExcelStructure(worksheet) {
    const requiredColumns = ['email', 'full_name', 'phone'];
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];
    
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Columnas faltantes: ${missingColumns.join(', ')}`);
    }
    
    return true;
  }

  /**
   * Validar datos de un usuario
   */
  static validateUserData(userData, rowIndex) {
    const errors = [];

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push(`Fila ${rowIndex}: Email inválido`);
    }

    if (!userData.full_name || userData.full_name.trim().length < 3) {
      errors.push(`Fila ${rowIndex}: Nombre completo inválido (mínimo 3 caracteres)`);
    }

    if (userData.phone && !/^\d{9,15}$/.test(userData.phone.toString().replace(/\s/g, ''))) {
      errors.push(`Fila ${rowIndex}: Teléfono inválido (debe tener entre 9 y 15 dígitos)`);
    }

    return errors;
  }

  /**
   * Procesar archivo Excel y crear usuarios
   */
  static async importUsersFromExcel(fileBuffer, options = {}) {
    const {
      defaultPassword = 'Temporal123',
      sendWelcomeEmail = false,
      skipDuplicates = true
    } = options;

    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      createdUsers: []
    };

    try {
      // Leer archivo Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Validar estructura
      this.validateExcelStructure(worksheet);

      // Convertir a JSON
      const data = XLSX.utils.sheet_to_json(worksheet);
      results.total = data.length;

      // Procesar cada fila
      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const rowIndex = i + 2; // +2 porque Excel empieza en 1 y tiene header

        try {
          // Validar datos
          const validationErrors = this.validateUserData(rowData, rowIndex);
          if (validationErrors.length > 0) {
            results.errors.push(...validationErrors);
            results.failed++;
            continue;
          }

          // Verificar si el usuario ya existe
          const existingUser = await User.findByEmail(rowData.email.trim().toLowerCase());
          
          if (existingUser) {
            if (skipDuplicates) {
              results.skipped++;
              results.errors.push(`Fila ${rowIndex}: Usuario con email ${rowData.email} ya existe (omitido)`);
              continue;
            } else {
              results.failed++;
              results.errors.push(`Fila ${rowIndex}: Usuario con email ${rowData.email} ya existe`);
              continue;
            }
          }

          // Crear usuario
          const userData = {
            email: rowData.email.trim().toLowerCase(),
            password: rowData.password || defaultPassword,
            full_name: rowData.full_name.trim(),
            phone: rowData.phone ? rowData.phone.toString().replace(/\s/g, '') : null,
            role: rowData.role || 'customer'
          };

          const newUser = await User.create(userData);
          
          // Opcional: Activar cuenta de crédito si se especifica
          if (rowData.credit_limit && parseFloat(rowData.credit_limit) > 0) {
            await User.enableCreditAccount(newUser.user_id, parseFloat(rowData.credit_limit));
          }

          results.successful++;
          results.createdUsers.push({
            email: newUser.email,
            full_name: newUser.full_name,
            user_id: newUser.user_id
          });

        } catch (error) {
          results.failed++;
          results.errors.push(`Fila ${rowIndex}: ${error.message}`);
        }
      }

      return results;

    } catch (error) {
      throw new Error(`Error procesando archivo Excel: ${error.message}`);
    }
  }

  /**
   * Generar plantilla Excel de ejemplo
   */
  static generateTemplate() {
    const templateData = [
      {
        email: 'usuario@ejemplo.com',
        full_name: 'Nombre Completo',
        phone: '987654321',
        password: 'opcional (se genera automático)',
        role: 'customer (opcional)',
        credit_limit: '0 (opcional)'
      },
      {
        email: 'juan.perez@uni.edu',
        full_name: 'Juan Pérez García',
        phone: '987123456',
        password: '',
        role: 'customer',
        credit_limit: '100'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuarios');

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 30 }, // email
      { wch: 25 }, // full_name
      { wch: 15 }, // phone
      { wch: 35 }, // password
      { wch: 20 }, // role
      { wch: 15 }  // credit_limit
    ];
    worksheet['!cols'] = colWidths;

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = ExcelImportService;