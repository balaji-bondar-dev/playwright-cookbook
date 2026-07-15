import { test, expect } from "@playwright/test";
const { readFileSync } = require("fs");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
let execEnv = { env: { ...process.env, FORCE_COLOR: "0" } };

let testDataJSON = "tests/test-data/community-case-creation-data.json";

let SiteName = "MIAW_Experiencce_Site";
let OrgName = "agentforce-org";
let clearTestDataBefore = true;
let clearTestDataAfter = true;

test("TS#001-create-community-case", async ({ page }) => {
  test.slow();

  //Load Test Data
  let testData = readFileSync(testDataJSON);
  var testDataObj = JSON.parse(testData);

  // clear test data before
  if (clearTestDataBefore) {
    try {
      console.log(">> Clearing test data before.");
      let sfOutput = await exec(
        "sf data:delete:record --json -s Case --where \"Subject='" +
          testDataObj.Subject +
          "'\"",
        execEnv
      );
      var jsonObj = JSON.parse(sfOutput.stdout.trim());
      console.log(">> Before clear data status: " + jsonObj.result.success);
    } catch (error) {
      console.log(">> No matching record found.");
    }
  }

  // Get SF Site Id
  let sfOutput = await exec(
    "sf data:query -o " +
      OrgName +
      " --json -q \"SELECT Id, GuestUserId FROM Site WHERE Name = '" +
      SiteName +
      "'\"",
    execEnv
  );

  var jsonObj = JSON.parse(sfOutput.stdout.trim());
  let SF_SITE_ID = jsonObj.result.records[0].Id;
  console.log(">> SF_SITE_ID " + SF_SITE_ID);

  // Get SF Site URL
  sfOutput = await exec(
    "sf data:query -o " +
      OrgName +
      " --json -q \"SELECT SecureURL FROM SiteDetail WHERE DurableId = '" +
      SF_SITE_ID +
      "'\"",
    execEnv
  );

  jsonObj = JSON.parse(sfOutput.stdout.trim());
  let SF_SITE_URL = jsonObj.result.records[0].SecureUrl;
  console.log(">> SF_SITE_URL " + SF_SITE_URL);

  //await page.goto("https://orgfarm-c52be2a542-dev-ed.develop.my.site.com/s/");
  await page.goto(SF_SITE_URL);

  await page.getByRole("button", { name: "Contact Support" }).click();

  await page.getByRole("textbox", { name: "Subject" }).click();
  await page
    .getByRole("textbox", { name: "Subject" })
    .fill(testDataObj.Subject);

  await page.getByRole("textbox", { name: "Description" }).click();
  await page
    .getByRole("textbox", { name: "Description" })
    .fill(testDataObj.Description);

  await page.getByRole("textbox", { name: "Web Email" }).click();
  await page
    .getByRole("textbox", { name: "Web Email" })
    .fill(testDataObj.WebEmail);

  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.locator("h1")).toContainText("Your case was created.");

  // Query SF and get case subject.
  sfOutput = await exec(
    "sf data:query --json -q \"SELECT Id,Subject FROM Case WHERE subject='" +
      testDataObj.Subject +
      "' ORDER BY CreatedDate DESC LIMIT 1\"",
    execEnv
  );

  jsonObj = JSON.parse(sfOutput.stdout.trim());
  //console.log(">> jsonObj.result.records[0]: " + jsonObj.result.records[0]);
  let CaseSubject = jsonObj.result.records[0].Subject;
  console.log(">> Case subject is: " + CaseSubject);

  // Verify case subject
  //expect(CaseSubject).toBe(testDataObj.Subject);

  // clear test data before
  if (clearTestDataAfter) {
    try {
      console.log(">> Clearing test data After.");
      let sfOutput = await exec(
        "sf data:delete:record --json -s Case --where \"subject='" +
          testDataObj.Subject +
          "'\"",
        execEnv
      );
      var jsonObj = JSON.parse(sfOutput.stdout.trim());
      console.log(">> After clear data status: " + jsonObj.result.success);
    } catch (error) {
      console.log(">> No matching record found.");
    }
  }
});
