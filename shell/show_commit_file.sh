#!/usr/bin/env bash


echo "查看当前版本的内容"
# 打印脚本信息
echo "执行的脚本名：$0"
echo "参数1 - 根目录绝对地址： $1"
echo "参数2 - commit_id： $2"
echo "参数3 - filename： $3"
root_path=$1
commit_id=$2
filename=$3
cd ${root_path}
echo "当前目录：" `pwd`

git show "${commit_id}":"${filename}"
