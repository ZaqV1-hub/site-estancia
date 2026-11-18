@echo off
cd /d C:\Sites\AzureIIS\site-estancia
set PATH=C:\Tools\node-v20.19.5-win-x64;%PATH%
set ESTANCIA_SITE_STORAGE_ROOT=C:\Sites\AzureIIS\site-estancia
set HOSTNAME=127.0.0.1
set PORT=3001
node --env-file=.env.local .next\standalone\server.js >> logs\next.stdout.log 2>> logs\next.stderr.log
