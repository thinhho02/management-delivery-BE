import ImageKit from 'imagekit';
import type { Document } from 'mongoose';


export const imagekit = new ImageKit({
    publicKey: process.env.PUBLIC_KEY_IMAGEKIT || '',
    privateKey: process.env.PRIVATE_KEY_IMAGEKIT || '',
    urlEndpoint: process.env.URL_ENDPOINT_IMAGEKIT || ''
});

export const processImage = async <T extends Document>(
    doc: T,
    buffer: Buffer<ArrayBufferLike>,
    nameField: string
): Promise<T> => {
    const { url } = await imagekit.upload({
        file: buffer.toString("base64"),
        fileName: "name.jpg",
    });
    doc.set({ [nameField]: url })
    return doc;
}
