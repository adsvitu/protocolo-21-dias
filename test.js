const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('dashboard.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });
setTimeout(() => {
  console.log("Title text:", dom.window.document.getElementById('title')?.textContent);
  console.log("Steps count:", dom.window.document.getElementById('steps')?.children.length);
}, 2000);
