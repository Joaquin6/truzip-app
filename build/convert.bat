sed 's/^M$//' build.sh > build.sh1
del build.sh
mv build.sh1 build.sh
sed 's/^M$//' qabuild.sh > qabuild.sh1
del qabuild.sh
mv qabuild.sh1 qabuild.sh