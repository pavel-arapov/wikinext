#!/bin/sh
cd /home/apps/;
export $(cat server-profile);
cd /home/apps/wikinext_github/wikinext/;git pull;#svn up;
/etc/init.d/wikinext restart;
/etc/init.d/wikinextsync restart;
#node web.js > /home/apps/logs/wikinext.access.log 2>&1 &