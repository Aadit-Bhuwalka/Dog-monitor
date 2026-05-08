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

    const previousDogs = JSON.parse(
      fs.readFileSync("previousDogs.json", "utf8")
    );

    const newDogs2 = dogs.filter(
      (dog) => !previousDogs.some((prev) => prev.link === dog.link)
    );

    if (newDogs2.length > 0) {
      console.log("New dogs found!");

      for (const dog of newDogs2) {
        console.log(dog);

        const embed = {
          title: `🐶 ${dog.name}`,
          description: dog.summary || "A new dog is available for adoption!",
          url: dog.link,
          color: 0xf4a460,
          fields: [
            {
              name: "Adopt",
              value: `[View profile](${dog.link})`,
              inline: false,
            },
          ],
          footer: {
            text: "SED Vision Australia",
          },
          timestamp: new Date().toISOString(),
        };

        if (dog.image) {
          embed.image = { url: dog.image };
        }

        await axios.post(DISCORD_WEBHOOK, {
          content: "🐾 New dog available for adoption!",
          embeds: [embed],
        });
      }

      fs.writeFileSync(
        "previousDogs.json",
        JSON.stringify(dogs, null, 2)
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