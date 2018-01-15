var dbHandler = require('/modules/dbHandler');

dbHandler.init("/Users/jamkong/workspace/webstorm/cnote/public/jamkong/test/dbs");
function test1() {
  dbHandler.filedirCollection.find({}, function (err, docs) {
    if (err) {
      console.error("err:" + err);
    } else {
      if (docs && docs.length > 0) {
        for (var i = 0; i < docs.length; i++) {
          console.log("docs[%s]:%o", i, docs[i]);
        }
      }

    }
  });
}

function main() {

  test1();
}

main();