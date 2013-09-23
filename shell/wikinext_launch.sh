#!/bin/sh
cd /home/apps/;
export $(cat server-profile);
cd /home/apps/wikinext_github/wikinext/;git pull;npm install;
/etc/init.d/wikinext restart;
#/etc/init.d/wikinextsync restart;
