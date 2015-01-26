#!/bin/sh
c=1
while [ $c -le 5 ]
do
    pwd >> /tmp/foo.log
    sleep 1
done

