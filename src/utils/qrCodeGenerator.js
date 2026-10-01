const QRCode = require('qrcode');

/**
 * Generates a Base64 Data URL QR Code for order verification
 * Contains token number, order ID, and verification payload
 */
const generateQRCodeDataURL = async (tokenNumber, orderId) => {
  try {
    const payload = JSON.stringify({
      token: tokenNumber,
      order_id: orderId,
      timestamp: Date.now()
    });

    const qrDataUrl = await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 250,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Failed to generate QR Code:', error.message);
    return '';
  }
};

module.exports = {
  generateQRCodeDataURL
};
