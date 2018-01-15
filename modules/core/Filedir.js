/**
 * Created by JamKong on 2017-04-30.
 */
//用来参考，没有实际作用
function Filedir(name, type, parent, path) {
  this.name = name;//文件名或目录名
  this.type = type;//['file','dir']
  this.parent = parent;//父级目录
  this.path = path;//路径,文件类型才需要
  this.createDate = new Date();
  this.updateDate = this.createDate;

  this.title = "";    //文章标题，瞬时数据（不保存到数据库，直接保存到cson格式文件）
  this.content = "";  //文章内容，瞬时数据（不保存到数据库，直接保存到cson格式文件）
  this.del_flag = false;//删除标记

}

module.exports = Filedir;