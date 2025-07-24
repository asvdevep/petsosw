pkill -9 -f "node servis.js"

SSL_KEY_PATH=./ssl/dev/private.key SSL_CERT_PATH=./ssl/dev/certificate.pem HTTP_PORT=8080 HTTPS_PORT=8443 node test-ws.js