#!/bin/bash
# --------defines--------
root=..
release=../release
deploy=../../deploy/qawebsite
# --------cleanup--------
rm -rf $release
rm -rf $deploy/client
rm -rf $deploy/server
# --------R.js build--------
mkdir $release
mkdir -p $deploy
node r.js -o build.js
# --------copy assets--------
rsync -rC --chmod=ugo=rwX $root/client/index.html $release/index.html
rsync -rC --chmod=ugo=rwX $root/client/sitemap.xml $release/sitemap.xml
rsync -rC --chmod=ugo=rwX $root/client/sitemap.xsl $release/sitemap.xsl
rsync -rC --chmod=ugo=rwX $root/client/BingSiteAuth.xml $release/BingSiteAuth.xml
rsync -rC --chmod=ugo=rwX $root/client/css $release
rsync -rC --chmod=ugo=rwX $root/client/images $release
rsync -rC --chmod=ugo=rwX $root/client/libs $release
rsync -rC --chmod=ugo=rwX $release $deploy
mv $deploy/release $deploy/client
rsync -rC --chmod=ugo=rwX $root/server $deploy
mv $deploy/server/package.json $deploy