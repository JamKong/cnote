#!/usr/bin/env bash
echo "sync repo"
# 打印脚本信息
echo "执行的脚本名：$0"
echo "参数1： $1"
#echo "参数2： $2"
local_path=$1
cd "${local_path}"
printf "当前目录："
pwd

# 开始执行脚本
echo "更新本地"
git pull
echo "更新远程"
date_str=`date "+%Y-%m-%d %H:%M:%S"`
echo ${date_str}
git status
# git log
echo "开始提交"
git add -A
git commit -m "${date_str}"
git push origin master
