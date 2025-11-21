const { Resend } = require('resend');

// Inicializar Resend con API key
const resend = new Resend(process.env.RESEND_API_KEY);

class EmailService {
    /**
     * Enviar email de recuperación de contraseña
     * @param {string} email - Email del destinatario
     * @param {string} resetToken - Token de recuperación
     * @param {string} userName - Nombre del usuario
     */
    static async sendPasswordResetEmail(email, resetToken, userName) {
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Snackify <noreply@snackify.com>',
            to: email,
            subject: 'Recuperación de Contraseña - Snackify',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Recuperación de Contraseña</title>
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td align="center" style="padding: 40px 0;">
                                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <!-- Header -->
                                    <tr>
                                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #4F46E5; border-radius: 8px 8px 0 0;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Snackify</h1>
                                        </td>
                                    </tr>

                                    <!-- Content -->
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Hola ${userName},</h2>
                                            <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                                                Recibimos una solicitud para restablecer la contraseña de tu cuenta en Snackify.
                                            </p>
                                            <p style="margin: 0 0 30px; color: #666666; font-size: 16px; line-height: 1.5;">
                                                Haz clic en el siguiente botón para crear una nueva contraseña:
                                            </p>

                                            <!-- Button -->
                                            <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                                <tr>
                                                    <td align="center">
                                                        <a href="${resetUrl}" style="display: inline-block; padding: 16px 32px; background-color: #4F46E5; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: bold; border-radius: 8px;">
                                                            Restablecer Contraseña
                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>

                                            <p style="margin: 30px 0 20px; color: #666666; font-size: 14px; line-height: 1.5;">
                                                Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:
                                            </p>
                                            <p style="margin: 0 0 20px; color: #4F46E5; font-size: 14px; word-break: break-all;">
                                                ${resetUrl}
                                            </p>

                                            <hr style="border: none; border-top: 1px solid #eeeeee; margin: 30px 0;">

                                            <p style="margin: 0; color: #999999; font-size: 14px; line-height: 1.5;">
                                                <strong>Importante:</strong> Este enlace expirará en 15 minutos por seguridad.
                                            </p>
                                            <p style="margin: 10px 0 0; color: #999999; font-size: 14px; line-height: 1.5;">
                                                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña no será modificada.
                                            </p>
                                        </td>
                                    </tr>

                                    <!-- Footer -->
                                    <tr>
                                        <td style="padding: 20px 40px; text-align: center; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
                                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                                &copy; ${new Date().getFullYear()} Snackify. Todos los derechos reservados.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('Error sending email:', error);
            throw new Error('Error al enviar el correo de recuperación');
        }

        return data;
    }

    /**
     * Enviar email de confirmación de cambio de contraseña
     * @param {string} email - Email del destinatario
     * @param {string} userName - Nombre del usuario
     */
    static async sendPasswordChangedEmail(email, userName) {
        const { data, error } = await resend.emails.send({
            from: process.env.EMAIL_FROM || 'Snackify <noreply@snackify.com>',
            to: email,
            subject: 'Tu contraseña ha sido cambiada - Snackify',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td align="center" style="padding: 40px 0;">
                                <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                    <tr>
                                        <td style="padding: 40px 40px 20px; text-align: center; background-color: #10B981; border-radius: 8px 8px 0 0;">
                                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Snackify</h1>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 40px;">
                                            <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Hola ${userName},</h2>
                                            <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                                                Tu contraseña ha sido cambiada exitosamente.
                                            </p>
                                            <p style="margin: 0 0 20px; color: #666666; font-size: 16px; line-height: 1.5;">
                                                Si no realizaste este cambio, por favor contacta a nuestro equipo de soporte inmediatamente.
                                            </p>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 20px 40px; text-align: center; background-color: #f8f8f8; border-radius: 0 0 8px 8px;">
                                            <p style="margin: 0; color: #999999; font-size: 12px;">
                                                &copy; ${new Date().getFullYear()} Snackify. Todos los derechos reservados.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>
                </body>
                </html>
            `
        });

        if (error) {
            console.error('Error sending confirmation email:', error);
            // No lanzar error aquí, es solo confirmación
        }

        return data;
    }
}

module.exports = EmailService;
