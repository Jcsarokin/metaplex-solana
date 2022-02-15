const fs = require("fs");
const assetDir = fs.readdirSync("./assets");
assetDir.forEach((data) => {
  const metadata = {
    name: `Giveaway Card #${data.split(".")[0]}`,
    description: "Exclusive access to future giveaways, airdrops & whitelists!",
    symbol: "JS",
    seller_fee_basis_points: 1500,
    image: "image.gif",
    properties: {
      files: [{ uri: `image.gif`, type: "image/gif" }],
      category: "image",
      creators: [
        {
          address: "6k4yQukdKGEtiYaecgHvT7YooN8ZUnhpm5cqVept4Bcw",
          share: 100,
        },
      ],
    },
    attributes: [{ trait_type: "attr", value: `#${data.split(".")[0]}` }],
  };
  fs.writeFileSync(
    `./assets/${data.split(".")[0]}.json`,
    JSON.stringify(metadata)
  );
});
