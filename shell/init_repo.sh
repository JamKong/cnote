#!/usr/bin/env bash

# 初始化仓库

echo "init 远程仓库"
# 打印脚本信息
echo "执行的脚本名：$0"
echo "参数1 当前用户目录： $1"
echo "参数2 远程仓库地址： $2"
user_path=$1
resp_addr=$2
cd "${user_path}"
printf "当前目录："
pwd

# 开始执行脚本
git clone ${resp_addr}
