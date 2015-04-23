#!/bin/sh
export NODE_ENV="production"
run="$(readlink "$0")"
cd "$(dirname "$run")"
exec node server.js 2>&1 >> /var/log/cork-labs.bk/server.js.log
sleep 1
echo `date` >> /var.log/cork-labs.bk/exit.log
