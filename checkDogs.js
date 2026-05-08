const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const nodemailer = require("nodemailer");

const URL =
  "https://sed.visionaustralia.org/about-us/news-and-stories?sort_by=created&sort_order=DESC&field_categories_target_id%5B3691%5D=3691";

const DISCORD_WEBHOOK = process.env.DISCORD_WEBHOOK;
const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
});

async function sendEmail(subject, html) {
  await mailer.sendMail({
    from: `"Dog Monitor 🐶" <${GMAIL_USER}>`,
    to: GMAIL_USER,
    subject,
    html,
  });
}

async function checkDogs() {
  try {
    const { data } = await axios.get(URL);

    const $ = cheerio.load(data);

    const dogs = [];

$(".card.image-card").each((i, el) => {

    const rawName = $(el)
        .find("h3.card-title")
        .text()
        .trim();

    // Strip "Adopt a career-changed dog: " prefix if present
    const name = rawName.replace(/^Adopt a career-changed dog:\s*/i, "");

    const summary = $(el)
        .find("p.news-desp")
        .text()
        .trim();

    const date = $(el)
        .find("p.badge.date")
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
            date,
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
              name: "Posted",
              value: dog.date || "Recently",
              inline: true,
            },
            {
              name: "Adopt",
              value: `[View profile](${dog.link})`,
              inline: true,
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

        await sendEmail(
          `🐶 New dog available for adoption: ${dog.name}`,
          `
            <h2>${dog.name}</h2>
            ${dog.image ? `<img src="${dog.image}" alt="${dog.name}" style="max-width:400px;border-radius:8px;"/>` : ""}
            <p>${dog.summary || ""}</p>
            <p><strong>Posted:</strong> ${dog.date || "Recently"}</p>
            <p><a href="${dog.link}">View adoption profile →</a></p>
            <hr/>
            <small>SED Vision Australia Dog Monitor</small>
          `
        );
      }

      fs.writeFileSync(
        "previousDogs.json",
        JSON.stringify(dogs, null, 2)
      );
    } else {
      console.log("No new dogs found.");

      await axios.post(DISCORD_WEBHOOK, {
        content: "🔍 Dog monitor ran — no new dogs found.",
      });

      await sendEmail(
        "🔍 Dog Monitor — No new dogs found",
        `
          <p>The dog monitor ran at ${new Date().toLocaleString("en-AU", { timeZone: "Australia/Melbourne" })} (Melbourne time) and found <strong>no new dogs</strong> available for adoption.</p>
          <p><a href="${URL}">View the adoption page →</a></p>
          <hr/>
          <small>SED Vision Australia Dog Monitor</small>
        `
      );
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkDogs();