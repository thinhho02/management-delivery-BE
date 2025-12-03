// src/utils/puppeteer.ts
import Chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";

import puppeteerCore from "puppeteer-core";


export async function launchBrowser() {
    // Nếu chạy local Windows/Mac → dùng Chrome full
    if (process.env.NODE_ENV !== "production") {
        return await puppeteer.launch({
            headless: true,
        });
    }

    // Nếu chạy trên Render/Vercel → dùng chromium
    return await puppeteerCore.launch({
        args: [...Chromium.args, "--hide-scrollbars", "--disable-web-security"],
        defaultViewport: Chromium.defaultViewport,
        executablePath: await Chromium.executablePath(),
        headless: true, // Use Chromium.headless for serverless compatibility
    });
}