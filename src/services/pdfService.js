const PDFDocument = require('pdfkit-table');

class PDFService {
  /**
   * Genera un PDF del reporte de crédito de un usuario
   */
  static generateCreditReportPDF(reportData, user) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // ==================== HEADER PRINCIPAL ====================
    doc.fillColor('#2C3E50')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('REPORTE DE CRÉDITO', { align: 'center' });

    doc.fillColor('#7F8C8D')
       .fontSize(11)
       .font('Helvetica')
       .text('Kanela - Sistema de Gestión de Crédito', { align: 'center' });

    doc.fillColor('#95A5A6')
       .fontSize(9)
       .text(`Generado el ${new Date().toLocaleDateString('es-PE', {
         year: 'numeric',
         month: 'long',
         day: 'numeric',
         hour: '2-digit',
         minute: '2-digit'
       })}`, { align: 'center' });

    doc.moveDown(1.5);

    // Línea separadora
    doc.strokeColor('#3498DB')
       .lineWidth(2)
       .moveTo(40, doc.y)
       .lineTo(555, doc.y)
       .stroke();

    doc.moveDown(1);

    // ==================== INFORMACIÓN DEL CLIENTE ====================
    const userTable = {
      title: {
        label: 'INFORMACIÓN DEL CLIENTE',
        fontSize: 12,
        color: '#2C3E50',
        fontFamily: 'Helvetica-Bold'
      },
      headers: [
        { label: 'Campo', property: 'field', width: 150, renderer: null },
        { label: 'Información', property: 'value', width: 365, renderer: null }
      ],
      datas: [
        { field: 'Nombre Completo', value: user.full_name },
        { field: 'Correo Electrónico', value: user.email },
        { field: 'Teléfono', value: user.phone || 'No registrado' },
        { field: 'Fecha del Reporte', value: new Date().toLocaleDateString('es-PE') },
      ],
      rows: [
        ['Nombre Completo', user.full_name],
        ['Correo Electrónico', user.email],
        ['Teléfono', user.phone || 'No registrado'],
        ['Fecha del Reporte', new Date().toLocaleDateString('es-PE')]
      ]
    };

    doc.table(userTable, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        doc.font(indexColumn === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000000');
      },
      headerBgColor: '#3498DB',
      headerTextColor: '#FFFFFF',
      padding: 5
    });

    doc.moveDown(1);

    // ==================== ESTADO DE CUENTA ====================
    const availableCredit = parseFloat(user.credit_limit) - parseFloat(user.current_balance);
    const usagePercent = (parseFloat(user.current_balance) / parseFloat(user.credit_limit)) * 100;

    const accountTable = {
      title: {
        label: 'ESTADO DE CUENTA',
        fontSize: 12,
        color: '#2C3E50',
        fontFamily: 'Helvetica-Bold'
      },
      headers: [
        { label: 'Concepto', property: 'concept', width: 200 },
        { label: 'Monto', property: 'amount', width: 150, align: 'right' },
        { label: 'Estado', property: 'status', width: 165 }
      ],
      rows: [
        ['Límite de Crédito', `S/ ${parseFloat(user.credit_limit).toFixed(2)}`, 'Total disponible'],
        ['Deuda Actual', `S/ ${parseFloat(user.current_balance).toFixed(2)}`, usagePercent > 80 ? '⚠️ Alta' : usagePercent > 50 ? 'Moderada' : '✓ Baja'],
        ['Crédito Disponible', `S/ ${availableCredit.toFixed(2)}`, availableCredit > 0 ? '✓ Disponible' : '✗ Agotado'],
        ['Uso de Crédito', `${usagePercent.toFixed(1)}%`, usagePercent < 90 ? 'Normal' : '⚠️ Límite alcanzado']
      ]
    };

    doc.table(accountTable, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
      prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
        const isDebt = indexRow === 1;
        const isAvailable = indexRow === 2;

        if (indexColumn === 0) {
          doc.font('Helvetica-Bold').fontSize(9).fillColor('#000000');
        } else if (indexColumn === 1) {
          doc.font('Helvetica-Bold').fontSize(9);
          if (isDebt && parseFloat(user.current_balance) > 0) {
            doc.fillColor('#E74C3C'); // Rojo para deuda
          } else if (isAvailable) {
            doc.fillColor('#27AE60'); // Verde para disponible
          } else {
            doc.fillColor('#000000');
          }
        } else {
          doc.font('Helvetica').fontSize(8).fillColor('#7F8C8D');
        }
      },
      headerBgColor: '#16A085',
      headerTextColor: '#FFFFFF',
      padding: 5
    });

    doc.moveDown(1);

    // ==================== RESUMEN DEL PERÍODO ====================
    if (reportData.summary) {
      const periodText = {
        'daily': 'HOY',
        'weekly': 'ÚLTIMOS 7 DÍAS',
        'monthly': 'ESTE MES'
      };

      const summaryTable = {
        title: {
          label: `RESUMEN DEL PERÍODO: ${periodText[reportData.period] || reportData.period.toUpperCase()}`,
          fontSize: 11,
          color: '#2C3E50',
          fontFamily: 'Helvetica-Bold'
        },
        headers: [
          { label: 'Total Ordenado', property: 'ordered', width: 171.67 },
          { label: 'Total Pagado', property: 'paid', width: 171.67 },
          { label: 'Total Pendiente', property: 'pending', width: 171.66 }
        ],
        rows: [
          [
            `S/ ${reportData.summary.total_ordered.toFixed(2)}`,
            `S/ ${reportData.summary.total_paid.toFixed(2)}`,
            `S/ ${reportData.summary.total_pending.toFixed(2)}`
          ]
        ]
      };

      doc.table(summaryTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          doc.font('Helvetica-Bold').fontSize(10);
          if (indexColumn === 1) {
            doc.fillColor('#27AE60'); // Verde para pagado
          } else if (indexColumn === 2) {
            doc.fillColor('#E74C3C'); // Rojo para pendiente
          } else {
            doc.fillColor('#3498DB'); // Azul para ordenado
          }
        },
        headerBgColor: '#9B59B6',
        headerTextColor: '#FFFFFF',
        padding: 8
      });

      doc.moveDown(1.5);
    }

    // ==================== PEDIDOS FIADOS CON ITEMS ====================
    if (reportData.orders?.items?.length > 0) {
      doc.addPage();

      doc.fillColor('#2C3E50')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('DETALLE DE PEDIDOS FIADOS', { align: 'center' });

      doc.moveDown(1);

      reportData.orders.items.forEach((order, index) => {
        // Si no cabe en la página, agregar nueva página
        if (doc.y > 650) {
          doc.addPage();
        }

        // Header del pedido
        const orderHeaderTable = {
          headers: [
            { label: 'N° Pedido', property: 'number', width: 100 },
            { label: 'Fecha', property: 'date', width: 100 },
            { label: 'Total', property: 'total', width: 100 },
            { label: 'Pagado', property: 'paid', width: 107.5 },
            { label: 'Pendiente', property: 'pending', width: 107.5 }
          ],
          rows: [
            [
              order.order_number,
              new Date(order.created_at).toLocaleDateString('es-PE'),
              `S/ ${parseFloat(order.total_amount).toFixed(2)}`,
              `S/ ${parseFloat(order.credit_paid_amount || 0).toFixed(2)}`,
              `S/ ${parseFloat(order.remaining_amount).toFixed(2)}`
            ]
          ]
        };

        doc.table(orderHeaderTable, {
          prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF'),
          prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
            doc.font('Helvetica-Bold').fontSize(8);
            if (indexColumn === 3) {
              doc.fillColor('#27AE60'); // Verde para pagado
            } else if (indexColumn === 4) {
              doc.fillColor('#E74C3C'); // Rojo para pendiente
            } else {
              doc.fillColor('#000000');
            }
          },
          headerBgColor: '#34495E',
          headerTextColor: '#FFFFFF',
          padding: 4
        });

        // Items del pedido
        if (order.items && Array.isArray(order.items) && order.items.length > 0) {
          const itemsTable = {
            title: {
              label: '📦 Items del Pedido',
              fontSize: 9,
              color: '#7F8C8D',
              fontFamily: 'Helvetica-Bold'
            },
            headers: [
              { label: 'Producto', property: 'product', width: 250 },
              { label: 'Cant.', property: 'qty', width: 60, align: 'center' },
              { label: 'P. Unit.', property: 'price', width: 100, align: 'right' },
              { label: 'Subtotal', property: 'subtotal', width: 105, align: 'right' }
            ],
            rows: order.items.map(item => [
              item.product_name,
              item.quantity.toString(),
              `S/ ${parseFloat(item.unit_price).toFixed(2)}`,
              `S/ ${parseFloat(item.subtotal).toFixed(2)}`
            ])
          };

          doc.table(itemsTable, {
            prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#34495E'),
            prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
              doc.font('Helvetica').fontSize(8).fillColor('#000000');
              if (indexColumn === 0) {
                doc.font('Helvetica').fillColor('#2C3E50');
              } else if (indexColumn === 3) {
                doc.font('Helvetica-Bold').fillColor('#16A085');
              }
            },
            headerBgColor: '#ECF0F1',
            headerTextColor: '#34495E',
            padding: 3
          });
        } else {
          doc.fontSize(8)
             .fillColor('#95A5A6')
             .font('Helvetica-Oblique')
             .text('Sin items registrados', { align: 'center' });
        }

        doc.moveDown(0.5);

        // Línea separadora entre pedidos
        if (index < reportData.orders.items.length - 1) {
          doc.strokeColor('#BDC3C7')
             .lineWidth(1)
             .moveTo(40, doc.y)
             .lineTo(555, doc.y)
             .stroke();
          doc.moveDown(0.5);
        }
      });
    }

    // ==================== PAGOS REALIZADOS ====================
    if (reportData.payments?.items?.length > 0) {
      doc.addPage();

      doc.fillColor('#2C3E50')
         .fontSize(16)
         .font('Helvetica-Bold')
         .text('PAGOS REALIZADOS', { align: 'center' });

      doc.moveDown(1);

      const paymentsTable = {
        headers: [
          { label: 'Fecha', property: 'date', width: 80 },
          { label: 'Método', property: 'method', width: 80 },
          { label: 'Pedido', property: 'order', width: 90 },
          { label: 'Notas', property: 'notes', width: 160 },
          { label: 'Monto', property: 'amount', width: 105, align: 'right' }
        ],
        rows: reportData.payments.items.map(payment => [
          new Date(payment.created_at).toLocaleDateString('es-PE'),
          this._translatePaymentMethod(payment.payment_method),
          payment.order_number || 'General',
          (payment.notes || '').substring(0, 30),
          `S/ ${parseFloat(payment.amount).toFixed(2)}`
        ])
      };

      doc.table(paymentsTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF'),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          doc.font('Helvetica').fontSize(8).fillColor('#000000');
          if (indexColumn === 4) {
            doc.font('Helvetica-Bold').fillColor('#27AE60');
          }
        },
        headerBgColor: '#27AE60',
        headerTextColor: '#FFFFFF',
        padding: 4
      });

      doc.moveDown(1);

      // Total de pagos
      const totalPaymentsTable = {
        headers: [
          { label: 'TOTAL PAGADO EN EL PERÍODO', property: 'label', width: 410 },
          { label: '', property: 'amount', width: 105, align: 'right' }
        ],
        rows: [
          [
            '',
            `S/ ${reportData.payments.total.toFixed(2)}`
          ]
        ]
      };

      doc.table(totalPaymentsTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
        prepareRow: (row, indexColumn, indexRow, rectRow, rectCell) => {
          doc.font('Helvetica-Bold').fontSize(11).fillColor('#27AE60');
        },
        headerBgColor: '#229954',
        headerTextColor: '#FFFFFF',
        padding: 5
      });
    }

    // ==================== FOOTER ====================
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);

      doc.fontSize(8)
         .fillColor('#95A5A6')
         .font('Helvetica')
         .text(
           `Página ${i + 1} de ${pageCount} | Kanela - Sistema de Crédito | ${new Date().toLocaleDateString('es-PE')}`,
           40,
           760,
           { align: 'center', width: 515 }
         );
    }

    return doc;
  }

  /**
   * Genera un PDF del estado de cuenta de un usuario
   */
  static generateAccountStatementPDF(accountData, user) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    // Header
    doc.fillColor('#2C3E50')
       .fontSize(24)
       .font('Helvetica-Bold')
       .text('ESTADO DE CUENTA', { align: 'center' });

    doc.fillColor('#7F8C8D')
       .fontSize(11)
       .font('Helvetica')
       .text('Kanela - Sistema de Gestión de Crédito', { align: 'center' });

    doc.moveDown(1.5);

    // Información del cliente
    const userTable = {
      title: {
        label: 'INFORMACIÓN DEL CLIENTE',
        fontSize: 12,
        color: '#2C3E50'
      },
      headers: [
        { label: 'Campo', width: 150 },
        { label: 'Valor', width: 365 }
      ],
      rows: [
        ['Nombre', user.full_name],
        ['Email', user.email],
        ['Teléfono', user.phone || 'No registrado'],
        ['Fecha', new Date().toLocaleDateString('es-PE')]
      ]
    };

    doc.table(userTable, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
      prepareRow: (row, indexColumn) => {
        doc.font(indexColumn === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor('#000000');
      },
      headerBgColor: '#3498DB',
      padding: 5
    });

    doc.moveDown(1);

    // Estado de cuenta
    const accountTable = {
      title: {
        label: 'RESUMEN DE CUENTA',
        fontSize: 12,
        color: '#2C3E50'
      },
      headers: [
        { label: 'Concepto', width: 200 },
        { label: 'Monto', width: 150, align: 'right' },
        { label: 'Estado', width: 165 }
      ],
      rows: [
        ['Límite de Crédito', `S/ ${accountData.account.credit_limit.toFixed(2)}`, ''],
        ['Deuda Actual', `S/ ${accountData.account.current_balance.toFixed(2)}`, ''],
        ['Crédito Disponible', `S/ ${accountData.account.available_credit.toFixed(2)}`, ''],
        ['Uso de Crédito', `${accountData.account.usage_percent}%`, '']
      ]
    };

    doc.table(accountTable, {
      prepareHeader: () => doc.font('Helvetica-Bold').fontSize(9).fillColor('#FFFFFF'),
      prepareRow: (row, indexColumn, indexRow) => {
        if (indexColumn === 1) {
          doc.font('Helvetica-Bold').fontSize(10);
          if (indexRow === 1) {
            doc.fillColor('#E74C3C');
          } else if (indexRow === 2) {
            doc.fillColor('#27AE60');
          } else {
            doc.fillColor('#000000');
          }
        } else {
          doc.font('Helvetica').fontSize(9).fillColor('#000000');
        }
      },
      headerBgColor: '#16A085',
      padding: 5
    });

    doc.moveDown(1);

    // Pedidos pendientes
    if (accountData.pending_orders?.length > 0) {
      const pendingTable = {
        title: {
          label: 'PEDIDOS PENDIENTES DE PAGO',
          fontSize: 11,
          color: '#E74C3C'
        },
        headers: [
          { label: 'N° Pedido', width: 100 },
          { label: 'Fecha', width: 100 },
          { label: 'Total', width: 100 },
          { label: 'Pagado', width: 107.5 },
          { label: 'Pendiente', width: 107.5 }
        ],
        rows: accountData.pending_orders.map(order => [
          order.order_number,
          new Date(order.created_at).toLocaleDateString('es-PE'),
          `S/ ${parseFloat(order.total_amount).toFixed(2)}`,
          `S/ ${parseFloat(order.credit_paid_amount || 0).toFixed(2)}`,
          `S/ ${parseFloat(order.remaining_amount).toFixed(2)}`
        ])
      };

      doc.table(pendingTable, {
        prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#FFFFFF'),
        prepareRow: (row, indexColumn) => {
          doc.font('Helvetica').fontSize(8);
          if (indexColumn === 4) {
            doc.fillColor('#E74C3C');
          } else {
            doc.fillColor('#000000');
          }
        },
        headerBgColor: '#E74C3C',
        padding: 4
      });
    }

    return doc;
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
