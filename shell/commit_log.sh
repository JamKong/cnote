#!/usr/bin/env bash
# 提交记录


echo "查看提交记录"
# 打印脚本信息
echo "执行的脚本名：$0"
echo "参数1 - 根目录绝对地址： $1"
echo "参数2 - 文件名： $2"
root_path=$1
file_name=$2
#echo ${root_path}
#echo ${file_name}
cd ${root_path}
echo "当前目录：" `pwd`
#echo "/Users/jamkong/workspace/webstorm/cnote/public/jamkong/test${file_name}"
echo "["
git log --pretty=oneline -20 ".${file_name}"
echo "]"