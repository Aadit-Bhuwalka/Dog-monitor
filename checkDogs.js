const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const URL =
  "https://sed.visionaustralia.org/about-our-dogs/released-dogs/adopt";

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;

async function checkDogs() {
  try {
    const { data } = await axios.get(URL);

    const $ = cheerio.load(data);

    const dogs = [];

    $(".views-row").each((i, el) => {
      const text = $(el).text().trim();

      if (text.length > 0) {
        dogs.push(text);
      }
    });

    const cleanedDogs = [...new Set(dogs)];

    const previousDogs = JSON.parse(
      fs.readFileSync("previousDogs.json", "utf8")
    );

    const newDogs = cleanedDogs.filter(
      (dog) => !previousDogs.includes(dog)
    );

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