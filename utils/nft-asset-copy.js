const fs = require("fs");

for (let i = 1; i < 5; i++) {
  fs.copyFileSync("./assets/0.gif", `./assets/${i}.gif`);
}
