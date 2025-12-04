import Chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer";

import puppeteerCore from "puppeteer-core";


export async function launchBrowser() {
    // Nếu chạy local
    // if (process.env.NODE_ENV !== "production") {
        return await puppeteer.launch();
    // }

    // Nếu chạy trên production
    // return await puppeteerCore.launch();
    // return await puppeteerCore.launch({
    //     args: [
    //         ...Chromium.args,
    //         "--disable-gpu",
    //         "--disable-dev-shm-usage",
    //         "--no-sandbox",
    //         "--disable-setuid-sandbox",
    //     ],
    //     defaultViewport: Chromium.defaultViewport,
    //     executablePath: await Chromium.executablePath(),
    //     headless: Chromium.headless === "shell" ? "shell" : true,
        
    // });
}