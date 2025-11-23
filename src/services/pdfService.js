const PDFDocument = require('pdfkit-table');

class PDFService {
  static generateCreditReportPDF(reportData, user) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header
    doc.fontSize(20).text('REPORTE DE CRÉDITO', { align: 'center' });
    doc.moveDown();

    // Tabla de información del usuario
    const userTable = {
      title: 'Información del Cliente',
      headers: ['Campo', 'Valor'],
      rows: [
        ['Nombre', user.full_name],
        ['Email', user.email],
        ['Teléfono', user.phone || 'No registrado'],
        ['Límite de crédito', `S/ ${parseFloat(user.credit_limit).toFixed(2)}`],
        ['Deuda actual', `S/ ${parseFloat(user.current_balance).toFixed(2)}`]
      ]
    };

    doc.table(userTable, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(10),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font('Helvetica').fontSize(9);
      }
    });

    doc.moveDown();

    // Tabla de pedidos
    if (reportData.orders?.items?.length > 0) {
      const ordersTable = {
        title: 'Pedidos Fiados',
        headers: ['N° Pedido', 'Fecha', 'Total', 'Pagado', 'Pendiente'],
        rows: reportData.orders.items.map(order => [
          order.order_number,
          new Date(order.created_at).toLocaleDateString('es-PE'),
          `S/ ${parseFloat(order.total_amount).toFixed(2)}`,
          `S/ ${parseFloat(order.credit_paid_amount || 0).toFixed(2)}`,
          `S/ ${parseFloat(order.remaining_amount).toFixed(2)}`
        ])
      };

      doc.addPage();
      doc.table(ordersTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
        prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('#000000'),
        headerBgColor: '#3498db',
        headerTextColor: '#FFFFFF'
      });
    }

    return doc;
  }
}

module.exports = PDFService;