import type { Document, Model } from "mongoose";
import slugify from "slugify";

const generateSlug = async <T extends Document>(
    model: Model<T>,
    name: string
): Promise<{newName: string; slug: string}> => {

    let slug = slugify.default(name, { lower: true, strict: true })
    let counter = 0;


    while (true) {
        const existingDoc = await model.findOne({ slug }).exec();

        if (!existingDoc) {
            break;
        }

        ++counter;
        slug = slugify.default(`${name} ${counter}`, { lower: true, strict: true });
    }

    return {
        newName: counter > 0 ? `${name} ${counter}` : name,
        slug
    }

}

export default generateSlug