/**
 * Created by JamKong on 2017-03-01.
 */
"use strict";
marked.setOptions({
  renderer: new marked.Renderer(),
  gfm: true,
  tables: true,
  breaks: true,
  pedantic: false,
  sanitize: false, // if false -> allow plain old HTML ;)
  smartLists: true,
  smartypants: true,
  highlight: function (code, lang) {
    // in case, there is code without language specified
    if (lang) {
      return hljs.highlight(lang, code).value;
    } else {
      return hljs.highlightAuto(code).value;
    }
  }
});