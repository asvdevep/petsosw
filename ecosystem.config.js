// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'servir',
    script: 'servis.js',
    env: {
      NODE_ENV: 'dvlp',
      HTTP_PORT: 8080,
      HTTPS_PORT: 8443,
      SSL_KEY_PATH: './ssl/dev/private.key',
      SSL_CERT_PATH: './ssl/dev/certificate.pem',
      SECURITY_CIPHERS: 'TLS_AES_128_GCM_SHA256',
      SECURITY_MIN_TLS: 'TLSv1.2'
    },
    //env_production: {
    //  NODE_ENV: 'production',
    //  HTTP_PORT: 80,
    //  HTTPS_PORT: 443,
    //  SSL_KEY_PATH: '/etc/letsencrypt/live/yourdomain.com/privkey.pem',
    //  SSL_CERT_PATH: '/etc/letsencrypt/live/yourdomain.com/fullchain.pem',
    //  SECURITY_CIPHERS: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256',
    //  SECURITY_MIN_TLS: 'TLSv1.3'
    //}
  }]
};