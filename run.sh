#!/bin/sh
run="$(readlink "$0")"
cd "$(dirname "$run")"
exec node server.js 2>&1 >> /var/log/jarvis.bk/server.js.log
sleep 1
echo ups >> /tmp/foo.log
