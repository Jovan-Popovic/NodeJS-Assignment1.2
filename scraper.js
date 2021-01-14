const fs = require("fs");

const cheerio = require("cheerio");
const axios = require("axios");
const converter = require("json-2-csv");

const writeStream = fs.createWriteStream("apartments.csv");

const fetchHtml = async (url) => {
  try {
    const { data } = await axios.get(url);
    return data;
  } catch {
    console.error(
      `ERROR: An error occurred while trying to fetch the URL: ${url}`
    );
  }
};

const scrapeApartments = async () => {
  // Fetch all pages
  const pageNum = 101;
  const urls = [...Array(pageNum).keys()].map(
    (element, index) =>
      `https://www.realitica.com/?cur_page=${index}&for=DuziNajam&pZpa=Crna+Gora&pState=Crna+Gora&type%5B%5D=&lng=hr`
  );
  console.log(urls);
  const apartmentsData = [];

  for await (let url of urls) {
    const html = await fetchHtml(url);
    let $ = cheerio.load(html);
    const data = await Promise.all(
      $(".thumb_div a")
        .toArray()
        .map(async (element) => {
          const html = await fetchHtml(element.attribs.href);
          console.log(element.attribs.href);

          let $ = cheerio.load(html);

          const keysScraper = (selector) => [
            ...$(selector)
              .toArray()
              .map((element) => $(element).text()),
          ];

          const valuesScraper = (selector) => [
            ...$(selector)
              .clone()
              .children()
              .remove()
              .end()
              .text()
              .replace(/\s\s+/g, "")
              .replace(/\n/g, " ")
              .replace(": ", "")
              .split(": ")
              .filter((element) => element !== "" && element !== ":"),
          ];

          const keys = [
            ...keysScraper("#listing_body strong"),
            ...keysScraper("#aboutAuthor strong"),
            ...keysScraper("div[style='clear: both'] strong"),
            "Slike",
          ];

          const values = [
            ...valuesScraper("#listing_body"),
            ...valuesScraper("#aboutAuthor"),
            ...valuesScraper("div[style='clear: both']"),
            $("#rea_blueimp img")
              .toArray()
              .map((image) => image.attribs.src) || "No images",
          ];
          const data = Object.assign(
            ...keys.map((key, index) => ({ [key]: values[index] }))
          );
          apartmentsData.push(data);
        })
    );
  }
  console.log(apartmentsData);
  const csv = converter.json2csv(apartmentsData, (err, csv) =>
    err ? console.log("Lol nope: ", err) : writeStream.write(csv)
  );
  return csv;
};

scrapeApartments();
