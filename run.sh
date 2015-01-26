#!/bin/sh
c=1
while [ $c -le 5 ]
do
    pwd >> /tmp/foo.log2
    sleep 1
done

