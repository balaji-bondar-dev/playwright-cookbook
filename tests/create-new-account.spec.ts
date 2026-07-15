import { test, expect } from "@playwright/test";
const { readFileSync } = require("fs");
const { promisify } = require("util");
const exec = promisify(require("child_process").exec);
let execEnv = { env: { ...process.env, FORCE_COLOR: "0" } };

let testDataJSON = "tests/test-data/create-new-account-data.json";

let OrgName = "agentforce-org";
let clearTestDataBefore = true;
let clearTestDataAfter = true;

test("TS#001-create-new-account", async ({ page }) => {
  test.slow();

  //Load Test Data
  let testData = readFileSync(testDataJSON);
  var testDataObj = JSON.parse(testData);

  // clear test data before
  if (clearTestDataBefore) {
    try {
      console.log(">> Clearing test data before...");
      let sfOutput = await exec(
        "sf data:delete:record -o " +
          OrgName +
          " --json -s Account --where \"Name='" +
          testDataObj.name +
          "'\"",
        execEnv
      );
      var jsonObj = JSON.parse(sfOutput.stdout.trim());
      console.log(">> Before clear data status: " + jsonObj.result.success);
    } catch (error) {
      console.log(">> No matching record found...");
    }
  }

  // Get SF pre-authenticated URL
  let sfOutput = await exec(
    "sf org:open -o " +
      OrgName +
      " --path /lightning/page/home --url-only --json",
    execEnv
  );
  var jsonObj = JSON.parse(sfOutput.stdout.trim());
  let SF_URL = jsonObj.result.url;
  console.log(">> SF_URL " + SF_URL);

  // start test here
  await page.goto(SF_URL);

  await page.getByRole("link", { name: "Accounts" }).click();
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("textbox", { name: "Account Name" }).click();
  await page
    .getByRole("textbox", { name: "Account Name" })
    .fill(testDataObj.Name);
  await page.getByRole("button", { name: "Save", exact: true }).click();

  // Assert result
  await page.waitForURL("**/view");
  await page.waitForSelector("records-highlights2");
  await expect(page.locator("records-highlights2")).toContainText(
    testDataObj.Name
  );

  // Get record Id from URL
  let url = new URL(page.url());
  let path_split = url.pathname.split("/");
  console.log(">> path_split " + path_split);

  // Assert URL
  expect(path_split[3]).toBe("Account");
  expect(path_split[5]).toBe("view");
  let AccountId = path_split[4];
  console.log(">> AccountId: " + AccountId);

  // clear test data after
  if (clearTestDataAfter) {
    try {
      console.log(">> Clearing test data after...");
      let sfOutput = await exec(
        "sf data:delete:record --json -s Account --where \"Name='" +
          testDataObj.Name +
          "'\"",
        execEnv
      );
      var jsonObj = JSON.parse(sfOutput.stdout.trim());
      console.log(">> After clear data status: " + jsonObj.result.success);
    } catch (error) {
      console.log(">> No matching record found...");
    }
  }

  // ** Test has passed!
  console.log(">> " + test.info().title + ": Test Passed!");
});
