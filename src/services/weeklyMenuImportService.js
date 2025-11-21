const XLSX = require('xlsx');
const WeeklyMenu = require('../models/WeeklyMenu');

class WeeklyMenuImportService {
  /**
   * Validar estructura del archivo Excel para menús
   */
  static validateExcelStructure(worksheet) {
    const requiredColumns = [
      'menu_date',
      'entry_description',
      'main_course_description',
      'drink_description',
      'dessert_description',
      'price'
    ];
    const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0];

    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Columnas faltantes: ${missingColumns.join(', ')}`);
    }

    return true;
  }

  /**
   * Validar datos de un menú
   */
  static validateMenuData(menuData, rowIndex) {
    const errors = [];

    if (!menuData.menu_date) {
      errors.push(`Fila ${rowIndex}: Fecha del menú requerida`);
    }

    if (!menuData.entry_description || menuData.entry_description.trim().length < 3) {
      errors.push(`Fila ${rowIndex}: Descripción de entrada inválida`);
    }

    if (!menuData.main_course_description || menuData.main_course_description.trim().length < 3) {
      errors.push(`Fila ${rowIndex}: Descripción de plato de fondo inválida`);
    }

    if (!menuData.drink_description || menuData.drink_description.trim().length < 2) {
      errors.push(`Fila ${rowIndex}: Descripción de bebida inválida`);
    }

    if (!menuData.dessert_description || menuData.dessert_description.trim().length < 2) {
      errors.push(`Fila ${rowIndex}: Descripción de postre/fruta inválida`);
    }

    if (!menuData.price || isNaN(parseFloat(menuData.price)) || parseFloat(menuData.price) <= 0) {
      errors.push(`Fila ${rowIndex}: Precio inválido`);
    }

    return errors;
  }

  /**
   * Parsear fecha desde Excel
   */
  static parseExcelDate(excelDate) {
    if (!excelDate) return null;

    // Si es número (formato Excel)
    if (typeof excelDate === 'number') {
      const date = XLSX.SSF.parse_date_code(excelDate);
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }

    // Si es string, intentar parsearlo
    if (typeof excelDate === 'string') {
      // Formato DD/MM/YYYY o DD-MM-YYYY
      const parts = excelDate.split(/[\/\-]/);
      if (parts.length === 3) {
        // Detectar si es DD/MM/YYYY o YYYY-MM-DD
        if (parts[0].length === 4) {
          return excelDate; // Ya está en formato YYYY-MM-DD
        }
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }

    return excelDate;
  }

  /**
   * Calcular deadline de reserva (2 días antes por defecto)
   */
  static calculateDeadline(menuDate, hoursBeforeDeadline = 48) {
    const date = new Date(menuDate);
    date.setHours(date.getHours() - hoursBeforeDeadline);
    return date.toISOString();
  }

  /**
   * Procesar archivo Excel y crear menús
   */
  static async importMenusFromExcel(fileBuffer, options = {}) {
    const {
      defaultMaxReservations = 30,
      hoursBeforeDeadline = 48,
      skipExistingDates = true
    } = options;

    const results = {
      total: 0,
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      createdMenus: []
    };

    try {
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      this.validateExcelStructure(worksheet);

      const data = XLSX.utils.sheet_to_json(worksheet);
      results.total = data.length;

      for (let i = 0; i < data.length; i++) {
        const rowData = data[i];
        const rowIndex = i + 2;

        try {
          // Parsear fecha
          rowData.menu_date = this.parseExcelDate(rowData.menu_date);

          // Validar datos
          const validationErrors = this.validateMenuData(rowData, rowIndex);
          if (validationErrors.length > 0) {
            results.errors.push(...validationErrors);
            results.failed++;
            continue;
          }

          // Verificar si ya existe menú para esa fecha
          const existingMenu = await WeeklyMenu.findByDate(rowData.menu_date);

          if (existingMenu) {
            if (skipExistingDates) {
              results.skipped++;
              results.errors.push(`Fila ${rowIndex}: Ya existe menú para ${rowData.menu_date} (omitido)`);
              continue;
            } else {
              results.failed++;
              results.errors.push(`Fila ${rowIndex}: Ya existe menú para ${rowData.menu_date}`);
              continue;
            }
          }

          // Calcular deadline
          const deadline = rowData.reservation_deadline ||
            this.calculateDeadline(rowData.menu_date, hoursBeforeDeadline);

          // Crear menú
          const menuData = {
            menu_date: rowData.menu_date,
            entry_description: rowData.entry_description.trim(),
            main_course_description: rowData.main_course_description.trim(),
            drink_description: rowData.drink_description.trim(),
            dessert_description: rowData.dessert_description.trim(),
            description: rowData.description ? rowData.description.trim() : null,
            price: parseFloat(rowData.price),
            reservation_deadline: deadline,
            max_reservations: rowData.max_reservations
              ? parseInt(rowData.max_reservations)
              : defaultMaxReservations
          };

          const newMenu = await WeeklyMenu.create(menuData);

          results.successful++;
          results.createdMenus.push({
            menu_id: newMenu.menu_id,
            menu_date: newMenu.menu_date,
            entry: newMenu.entry_description,
            main_course: newMenu.main_course_description
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
   * Generar plantilla Excel de ejemplo para menús
   */
  static generateMenuTemplate() {
    const today = new Date();
    const templateData = [];

    // Generar ejemplo para 5 días de la próxima semana
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    const entries = ['Ensalada César', 'Sopa de verduras', 'Ceviche de champiñones', 'Crema de zapallo', 'Ensalada caprese'];
    const mainCourses = ['Lomo saltado con arroz', 'Pollo a la plancha con puré', 'Pescado al horno con ensalada', 'Tallarines verdes con bistec', 'Arroz chaufa de pollo'];
    const drinks = ['Chicha morada', 'Limonada', 'Refresco de maracuyá', 'Agua mineral', 'Jugo de naranja'];
    const desserts = ['Mazamorra morada', 'Fruta de estación', 'Gelatina', 'Arroz con leche', 'Manzana'];

    for (let i = 0; i < 5; i++) {
      const menuDate = new Date(today);
      menuDate.setDate(today.getDate() + (7 - today.getDay()) + i + 1); // Próxima semana

      templateData.push({
        menu_date: menuDate.toISOString().split('T')[0],
        entry_description: entries[i],
        main_course_description: mainCourses[i],
        drink_description: drinks[i],
        dessert_description: desserts[i],
        description: `Menú del ${dayNames[i]}`,
        price: 8.50,
        max_reservations: 30
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Menus');

    const colWidths = [
      { wch: 12 }, // menu_date
      { wch: 30 }, // entry_description
      { wch: 35 }, // main_course_description
      { wch: 20 }, // drink_description
      { wch: 20 }, // dessert_description
      { wch: 25 }, // description
      { wch: 8 },  // price
      { wch: 18 }  // max_reservations
    ];
    worksheet['!cols'] = colWidths;

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }
}

module.exports = WeeklyMenuImportService;
