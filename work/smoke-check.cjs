const fs = require('fs');
const html = fs.readFileSync('outputs/bluearchive-cafe-simulator.html', 'utf8');
const data = JSON.parse(html.match(/<script id="initial-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const no = data.furniture.filter(f => f.craftable === false);
const yes = data.furniture.filter(f => f.craftable === true);
const unk = data.furniture.filter(f => f.craftable == null);
console.log(JSON.stringify({ craftable: yes.length, notCraftable: no.length, unknown: unk.length, sample: no.slice(0,3).map(f => ({ name: f.name, manufactureText: f.manufactureText, obtainText: f.obtainText })) }, null, 2));
