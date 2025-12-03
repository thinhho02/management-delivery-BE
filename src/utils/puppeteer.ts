// src/utils/puppeteer.ts
import Chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export async function launchBrowser() {
  const executablePath = await Chromium.executablePath();

  return await puppeteer.launch({
    args: Chromium.args,
    executablePath,
    headless: true,

  });
}