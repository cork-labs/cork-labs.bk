#!/bin/sh
cd "$(dirname "$0")"
node server.js
sleep 1
echo ups >> /tmp/foo.log
