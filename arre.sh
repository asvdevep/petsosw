
pm2 stop servir
pm2 delete servir 
pm2 start ecosystem.config.js
pm2 status

# pkill -9 -f "node servis.js"
# node servis.js