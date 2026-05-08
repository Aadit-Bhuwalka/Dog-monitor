const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const URL =
  "https://sed.visionaustralia.org/about-us/news-and-stories?sort_by=created&sort_order=DESC&field_categories_target_id%5B3691%5D=3691";

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function checkDogs() {
  try {
    const { data } = await axios.get(URL);

    const $ = cheerio.load(data);

    const dogs = [];

$(".card.image-card").each((i, el) => {

    const name = $(el)
        .find("h3.card-title")
        .text()
        .trim();

    const summary = $(el)
        .find("p.news-desp")
        .text()
        .trim();

    const image = $(el)
        .find("img")
        .attr("src");

    const relativeLink = $(el)
        .find("a")
        .attr("href");

    const link = relativeLink
        ? `https://sed.visionaustralia.org${relativeLink}`
        : URL;

    const imageUrl = image
        ? `https://sed.visionaustralia.org${image}`
        : "";

    if (name) {
        dogs.push({
            name,
            summary,
            image: imageUrl,
            link
        });
    }
});
console.log("DOGS FOUND:");
console.log(JSON.stringify(dogs, null, 2));
console.log("TOTAL DOGS:", dogs.length);

    const cleanedDogs = [...new Set(dogs)];

    const previousDogs = JSON.parse(
      fs.readFileSync("previousDogs.json", "utf8")
    );

    const newDogs = dogs;

    if (newDogs.length > 0) {
      console.log("New dogs found!");

      for (const dog of newDogs) {
        console.log(dog);

        await axios.post(DISCORD_WEBHOOK, {
          content: `🐶 New dog available for adoption!\n\n${dog}\n\n${URL}`,
        });
      }

      fs.writeFileSync(
        "previousDogs.json",
        JSON.stringify(cleanedDogs, null, 2)
      );
    } else {
      console.log("No new dogs found.");
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDogs();