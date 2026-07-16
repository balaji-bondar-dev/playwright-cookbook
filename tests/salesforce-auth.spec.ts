import { test, expect } from "@playwright/test";
import * as OTPAuth from "otpauth";
import "dotenv/config";

// Retrieve credentials securely from environment variables
const SF_URL = process.env.SF_LOGIN_URL || "https://login.salesforce.com";
const SF_USER = process.env.SF_USERNAME!;
const SF_PASSWORD = process.env.SF_PASSWORD!;
const SF_MFA_SECRET = process.env.SF_MFA_SECRET!; // Your saved Base32 token

test("Salesforce Login with programmatic MFA via OTPAuth", async ({ page }) => {
  const cleanSecret = SF_MFA_SECRET.replace(/\s+/g, "").toUpperCase();

  // 4. Generate the current TOTP token using otpauth
  const totp = new OTPAuth.TOTP({
    issuer: "Salesforce",
    label: SF_USER,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(cleanSecret)
  });

  //const token = totp.generate();
  //console.log(`Generated MFA Token: ${token}`);

  // 1. Navigate to Salesforce Login page
  await page.goto(SF_URL);

  // 2. Fill Username and Password
  await page.locator("#username").fill(SF_USER);
  await page.locator("#password").fill(SF_PASSWORD);
  await page.locator("#Login").click();

  // 4. Wait for MFA Verification Screen
  // Salesforce might prompt to enter an Authenticator Code

  // Dynamically check for multiple common Salesforce MFA selectors
  const selector = await page.waitForSelector(
    '#et, #smscode, #tc, input[type="text"]',
    { timeout: 15000 }
  );

  // Determine exactly which element matched to safely target it
  const inputId = await page.evaluate((el) => el.id, selector);
  console.log(`Matched MFA selector ID: ${inputId}`);

  const currentToken = totp.generate();
  await page.type(`#${inputId}`, currentToken);

  // Click the respective action button (Submit buttons vary by page structure)
  await page.click('#save, #tc_submit, input[type="submit"]');
});
