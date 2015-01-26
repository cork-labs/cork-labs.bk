#!/bin/sh
c=1
while [ $c -le 5 ]
do
    echo y >> /tmp/foo.log
    sleep 1
done

