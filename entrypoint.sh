#!/bin/sh

cd /app/api && node dist/server.js &
cd /app/web && node server.js &

wait -n
exit $?
