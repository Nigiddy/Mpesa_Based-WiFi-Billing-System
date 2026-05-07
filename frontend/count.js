const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory() && !file.includes('node_modules') && !file.includes('.next')) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      const lines = fs.readFileSync(file, 'utf-8').split('\n').length;
      results.push({ file: file.replace(process.cwd(), ''), lines });
    }
  });
  return results;
};

const res = walk('.');
res.sort((a, b) => b.lines - a.lines);
console.log(res.slice(0, 20).map(x => `${x.lines} ${x.file}`).join('\n'));
