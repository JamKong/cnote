#!/usr/bin/env bash


echo "比较两个commit记录的差别"
# 打印脚本信息
echo "执行的脚本名：$0"
echo "参数1 - 根目录绝对地址： $1"
echo "参数2 - commit_id_1： $2"
echo "参数3 - commit_id_2： $3"
root_path=$1
commit_id_1=$2
commit_id_2=$3
cd ${root_path}
echo "当前目录：" `pwd`
echo "["
git diff "${commit_id_1}" "${commit_id_2}"
echo "]"