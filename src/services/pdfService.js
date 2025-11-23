const PDFDocument = require('pdfkit');

class PDFService {
  /**
   * Genera un PDF del reporte de crédito de un usuario
   * @param {Object} reportData - Datos del reporte
   * @param {Object} user - Información del usuario
   * @returns {PDFDocument} - Documento PDF
   */
  static generateCreditReportPDF(reportData, user) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('REPORTE DE CRÉDITO', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
       .text('Kanela - Sistema de Crédito', { align: 'center' });
    doc.moveDown(1);

    // Línea separadora
    doc.strokeColor('#000000').lineWidth(1)
       .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Información del usuario
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
       .text('Información del Cliente', 50);
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica')
       .text(`Nombre: ${user.full_name}`, 50)
       .text(`Email: ${user.email}`)
       .text(`Teléfono: ${user.phone || 'No registrado'}`)
       .text(`Fecha del reporte: ${new Date().toLocaleDateString('es-PE', {
         year: 'numeric',
         month: 'long',
         day: 'numeric'
       })}`);

    if (reportData.period) {
      const periodText = {
        'daily': 'Diario',
        'weekly': 'Semanal (últimos 7 días)',
        'monthly': 'Mensual'
      };
      doc.text(`Período: ${periodText[reportData.period] || reportData.period}`);
    }

    doc.moveDown(1);

    // Línea separadora
    doc.strokeColor('#CCCCCC').lineWidth(0.5)
       .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Estado de cuenta
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
       .text('Estado de Cuenta', 50);
    doc.moveDown(0.5);

    const creditInfo = [
      { label: 'Límite de crédito:', value: `S/ ${user.credit_limit.toFixed(2)}`, color: '#000000' },
      { label: 'Deuda actual:', value: `S/ ${user.current_balance.toFixed(2)}`, color: user.current_balance > 0 ? '#DC3545' : '#28A745' },
      { label: 'Crédito disponible:', value: `S/ ${(user.credit_limit - user.current_balance).toFixed(2)}`, color: '#28A745' },
      { label: 'Uso de crédito:', value: `${((user.current_balance / user.credit_limit) * 100).toFixed(1)}%`, color: '#000000' }
    ];

    creditInfo.forEach(info => {
      doc.fontSize(10).font('Helvetica').fillColor('#000000')
         .text(info.label, 50, doc.y, { continued: true, width: 150 })
         .font('Helvetica-Bold').fillColor(info.color)
         .text(info.value);
    });

    doc.moveDown(1);

    // Resumen del período
    if (reportData.summary) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
         .text('Resumen del Período', 50);
      doc.moveDown(0.5);

      doc.fontSize(10).font('Helvetica').fillColor('#000000')
         .text(`Total ordenado: S/ ${reportData.summary.total_ordered.toFixed(2)}`, 50)
         .text(`Total pagado: S/ ${reportData.summary.total_paid.toFixed(2)}`)
         .text(`Total pendiente: S/ ${reportData.summary.total_pending.toFixed(2)}`);

      doc.moveDown(1);
    }

    // Pedidos fiados
    if (reportData.orders && reportData.orders.items && reportData.orders.items.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
         .text('Pedidos Fiados', 50);
      doc.moveDown(1);

      reportData.orders.items.forEach((order, index) => {
        // Verificar si necesitamos una nueva página
        if (doc.y > 700) {
          doc.addPage();
          doc.moveDown(1);
        }

        // Encabezado del pedido
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
           .text(`Pedido #${order.order_number}`, 50);

        doc.fontSize(9).font('Helvetica').fillColor('#666666')
           .text(`Fecha: ${new Date(order.created_at).toLocaleDateString('es-PE')}`, 50, doc.y, { continued: true, width: 200 })
           .text(`Estado: ${this._translateStatus(order.payment_status)}`, { align: 'right' });

        doc.moveDown(0.3);

        // Items del pedido
        if (order.items && Array.isArray(order.items)) {
          doc.fontSize(9).font('Helvetica').fillColor('#000000');

          order.items.forEach(item => {
            const itemText = `  • ${item.product_name} x${item.quantity}`;
            const priceText = `S/ ${parseFloat(item.subtotal).toFixed(2)}`;

            doc.text(itemText, 60, doc.y, { continued: true, width: 350 })
               .text(priceText, { align: 'right' });
          });
        }

        doc.moveDown(0.3);

        // Totales del pedido
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
           .text(`Total: S/ ${parseFloat(order.total_amount).toFixed(2)}`, 60, doc.y, { continued: true, width: 350 });

        if (parseFloat(order.credit_paid_amount) > 0) {
          doc.fillColor('#28A745')
             .text(`Pagado: S/ ${parseFloat(order.credit_paid_amount).toFixed(2)}`, { align: 'right' });
        }

        doc.fillColor('#DC3545').text(`Pendiente: S/ ${parseFloat(order.remaining_amount).toFixed(2)}`, 60);

        // Línea separadora
        doc.moveDown(0.5);
        doc.strokeColor('#EEEEEE').lineWidth(0.5)
           .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(0.5);
      });
    }

    // Pagos realizados
    if (reportData.payments && reportData.payments.items && reportData.payments.items.length > 0) {
      doc.addPage();
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
         .text('Pagos Realizados', 50);
      doc.moveDown(1);

      // Encabezado de tabla
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF');
      doc.rect(50, doc.y, 495, 20).fill('#4A90E2');

      const headerY = doc.y - 15;
      doc.text('Fecha', 60, headerY, { width: 80, align: 'left' })
         .text('Método', 150, headerY, { width: 80, align: 'left' })
         .text('Pedido', 240, headerY, { width: 80, align: 'left' })
         .text('Monto', 440, headerY, { width: 90, align: 'right' });

      doc.moveDown(0.5);

      // Contenido de tabla
      reportData.payments.items.forEach((payment, index) => {
        if (doc.y > 720) {
          doc.addPage();
          doc.moveDown(1);
        }

        const bgColor = index % 2 === 0 ? '#F8F9FA' : '#FFFFFF';
        const rowY = doc.y;

        doc.rect(50, rowY, 495, 20).fill(bgColor);

        doc.fontSize(8).font('Helvetica').fillColor('#000000')
           .text(new Date(payment.created_at).toLocaleDateString('es-PE'), 60, rowY + 5, { width: 80, align: 'left' })
           .text(this._translatePaymentMethod(payment.payment_method), 150, rowY + 5, { width: 80, align: 'left' })
           .text(payment.order_number || 'General', 240, rowY + 5, { width: 80, align: 'left' })
           .fillColor('#28A745')
           .text(`S/ ${parseFloat(payment.amount).toFixed(2)}`, 440, rowY + 5, { width: 90, align: 'right' });

        doc.y = rowY + 20;
      });

      doc.moveDown(1);

      // Total de pagos
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000')
         .text(`Total pagado en el período: `, 350, doc.y, { continued: true })
         .fillColor('#28A745')
         .text(`S/ ${reportData.payments.total.toFixed(2)}`);
    }

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#666666')
       .text(`Generado el ${new Date().toLocaleString('es-PE')}`, 50, 750, { align: 'center' })
       .text('Kanela - Sistema de Gestión de Crédito', { align: 'center' });

    return doc;
  }

  /**
   * Genera un PDF del estado de cuenta de un usuario
   * @param {Object} accountData - Datos de la cuenta
   * @param {Object} user - Información del usuario
   * @returns {PDFDocument} - Documento PDF
   */
  static generateAccountStatementPDF(accountData, user) {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('ESTADO DE CUENTA', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
       .text('Kanela - Sistema de Crédito', { align: 'center' });
    doc.moveDown(1);

    // Línea separadora
    doc.strokeColor('#000000').lineWidth(1)
       .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Información del usuario
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
       .text(`Cliente: ${user.full_name}`, 50)
       .fontSize(10).font('Helvetica')
       .text(`Email: ${user.email}`)
       .text(`Fecha: ${new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' })}`);

    doc.moveDown(1);

    // Estado de cuenta destacado
    doc.rect(50, doc.y, 495, 100).fillAndStroke('#F0F8FF', '#4A90E2');
    const accountBoxY = doc.y + 20;

    doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
       .text('Información de Crédito', 70, accountBoxY);

    doc.fontSize(10).font('Helvetica')
       .text(`Límite de crédito: S/ ${accountData.account.credit_limit.toFixed(2)}`, 70, accountBoxY + 25)
       .fillColor(accountData.account.current_balance > 0 ? '#DC3545' : '#28A745')
       .text(`Deuda actual: S/ ${accountData.account.current_balance.toFixed(2)}`, 70, accountBoxY + 40)
       .fillColor('#28A745')
       .text(`Crédito disponible: S/ ${accountData.account.available_credit.toFixed(2)}`, 70, accountBoxY + 55)
       .fillColor('#000000')
       .text(`Uso: ${accountData.account.usage_percent}%`, 70, accountBoxY + 70);

    doc.y += 120;
    doc.moveDown(1);

    // Pedidos pendientes
    if (accountData.pending_orders && accountData.pending_orders.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
         .text('Pedidos Pendientes de Pago', 50);
      doc.moveDown(0.5);

      accountData.pending_orders.forEach(order => {
        if (doc.y > 700) {
          doc.addPage();
        }

        doc.fontSize(10).font('Helvetica-Bold')
           .text(`${order.order_number}`, 60, doc.y, { continued: true, width: 100 })
           .font('Helvetica')
           .text(`${new Date(order.created_at).toLocaleDateString('es-PE')}`, { continued: true, width: 150 })
           .fillColor('#DC3545')
           .text(`S/ ${parseFloat(order.remaining_amount).toFixed(2)}`, { align: 'right' });

        doc.fillColor('#000000');
        doc.moveDown(0.3);
      });
    }

    return doc;
  }

  /**
   * Traduce el estado de pago al español
   */
  static _translateStatus(status) {
    const translations = {
      'pending': 'Pendiente',
      'partial': 'Pago parcial',
      'paid': 'Pagado',
      'overdue': 'Vencido'
    };
    return translations[status] || status;
  }

  /**
   * Traduce el método de pago al español
   */
  static _translatePaymentMethod(method) {
    const translations = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'yape': 'Yape',
      'plin': 'Plin',
      'transfer': 'Transferencia'
    };
    return translations[method] || method;
  }
}

module.exports = PDFService;
