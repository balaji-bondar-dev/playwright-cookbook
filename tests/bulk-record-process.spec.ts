import { test, expect } from "@playwright/test";
import * as OTPAuth from "otpauth";
import "dotenv/config";
import jsforce from "jsforce";

// Retrieve credentials securely from environment variables
const SF_URL = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
const SF_USER = process.env.SF_USERNAME!;
const SF_PASSWORD = process.env.SF_PASSWORD!;
const SF_SECURITY_TOKEN = process.env.SF_SECURITY_TOKEN;
//const SF_MFA_SECRET = process.env.SF_MFA_SECRET!; // Your saved Base32 token

test("Bulk delete records using JSforce", async ({ page }) => {
  //1. Establish your connection
  const conn = new jsforce.Connection({
    loginUrl: SF_URL
  });
  await conn.login(SF_USER, SF_PASSWORD + SF_SECURITY_TOKEN);

  // 2. Query and delete records matching a condition
  const results = await conn
    .sobject("Account")
    .find({
      Name: "Test Account"
    })
    .destroy({
      allowBulk: true, // Enable switching to Bulk API for large datasets
      bulkThreshold: 200, // Switch to Bulk API if records exceed this number
      bulkApiVersion: 2 // Use Bulk V2 API (default in modern JSforce)
    });

  console.log(`>> Successfully processed ${results.length} delete results.`);
});

test("Bulk insesrt records using JSforce", async ({ page }) => {
  //1. Establish your connection
  const conn = new jsforce.Connection({
    loginUrl: SF_URL
  });
  await conn.login(SF_USER, SF_PASSWORD + SF_SECURITY_TOKEN);

  // 1. Define the array of accounts to insert
  const accountsToInsert = [
    { Name: "Acme Corp", Industry: "Technology", Phone: "555-0100" },
    { Name: "Stark Industries", Industry: "Defense", Phone: "555-0200" },
    { Name: "Wayne Enterprises", Industry: "Finance", Phone: "555-0300" }
  ];

  // 2. Insert records using the SObject reference
  const results = await conn.sobject("Account").create(accountsToInsert, {
    allowBulk: true, // Switch to Bulk API if the dataset is large
    bulkApiVersion: 2 // Use Bulk V2 engine for modern speed limits
  });

  // 3. Handle the results loop
  results.forEach((result, index) => {
    //console.debug("${index}");
    //console.debug(">> index: ${index}, result: ${result}");

    if (result.success) {
      console.log(">> index: " + (index + 1) + ", account.id:" + result.id);
    } else {
      console.error("Error on Account #${index + 1}:", result.errors);
    }
  });
});
