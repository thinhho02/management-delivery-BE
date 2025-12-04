import { generatePdf, type Options } from "html-pdf-node";

export function generatePdfAsync(html: string, pageSize: string = "A6"): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        try {
            const file = { content: html };

            const options: Options = {
                format: pageSize,
                displayHeaderFooter: false,
                printBackground: true,
                margin: { top: "0mm", bottom: "0mm", left: "0mm", right: "0mm" }
            };

            generatePdf(file, options, (err: Error | null, buffer: Buffer) => {
                if (err) {
                    console.error("PDF generation error:", err);
                    return reject(err);
                }

                if (!buffer) {
                    return reject(new Error("PDF buffer is empty!"));
                }

                return resolve(buffer);
            });
        } catch (error) {
            console.error("Unexpected PDF generation exception:", error);
            reject(error);
        }
    });
}