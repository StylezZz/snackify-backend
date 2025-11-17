const { PutObjectCommand } = require("@aws-sdk/client-s3");
const { s3 } = require('../config/s3');
const crypto = require('crypto');

const uploadImageToS3 = async (file) => {
    try {
        if (!file) {
            throw new Error("No se recibió ningún archivo.");
        }

        // Validar tipo MIME
        if (!file.mimetype.startsWith("image/")) {
            throw new Error("Solo se permiten imágenes");
        }

        const filename = `productos/${crypto.randomUUID()}-${file.originalname}`;

        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: filename,
          Body: file.buffer,
          ContentType: file.mimetype
        });

        await s3.send(command);

        return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${filename}`;
  } catch (err) {
    console.error("Error al subir a S3:", err);
    throw err;
  }
}

module.exports = {uploadImageToS3};

