/**
 * Reads a CSV file and writes an array of JSON objects to a file.
 * 
 * The CSV file should have a header row. The JSON file will have the same name
 * as the CSV file but with a `.json` extension. Each row in the CSV will be
 * converted to an object in the JSON array, with keys derived from the CSV headers.
 * 
 * If `PROCESS_ALL` is set to `false`, the function will stop after processing 10 rows.
 * 
 * @param {string} csvFilePath - The path to the CSV file to be read.
 * @param {string} jsonFilePath - The path where the JSON file will be written.
 */

import fs from "fs";
import csv from "csv-parser";

export const createJsonObjectFromCSV = (csvFilePath, jsonFilePath) => {
    const jsonObject = [];
    let rowCount = 0; // Initialize a counter for rows
    const PROCESS_ALL = true

    fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on("data", (row) => {
        if (rowCount < 10 || PROCESS_ALL) { // Check if the row count is less than 10
            jsonObject.push(row);
            rowCount++; // Increment the row counter
        }
    })
    .on("end", () => {
        fs.writeFileSync(jsonFilePath, JSON.stringify(jsonObject, null, 2));
    });
};

createJsonObjectFromCSV("./giftCardCodes.csv", "./giftCardCodes.json");