import type { ZoneType } from "@/controllers/mapbox.controller.js";
import axios from "axios";
import FormData from "form-data";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export const ListTilesets = async (queryString: Record<string, any>): Promise<Record<string, any>> => {
    const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME;
    const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

    const baseUrl = `https://api.mapbox.com/tilesets/v1/${MAPBOX_USERNAME}`

    const resLists = await axios.get(baseUrl, {
        params: {
            access_token: MAPBOX_ACCESS_TOKEN,
            ...queryString
        }
    })

    return resLists.data
}

export const checkStatusJob = async (jobId: string, tilesetId: string): Promise<Record<string, any>> => {
    const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

    const baseUrl = `https://api.mapbox.com/tilesets/v1/${tilesetId}/jobs/${jobId}?access_token=${MAPBOX_ACCESS_TOKEN}`
    let status;
    let count = 0;

    while (true) {
        const res = await axios.get(baseUrl)
        status = res.data

        console.log(`Polling job: ${jobId}, stage = ${status.stage}`);

        if (status.stage === "success" || status.stage === "failed") {
            break;
        }
        count++;
        if (count > 60) throw new Error("Job timeout after 60 checks (≈5 minutes)");

        await sleep(10000)
    }
    return status
}

export const createTileService = async (features: any[], zone: ZoneType, file: Express.Multer.File, tilesetId: string): Promise<string> => {
    const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME;
    const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
    console.log("log: createTileService")

    const ndjson = features.map((f: any) => JSON.stringify(f)).join("\n");
    const uploadBuffer = Buffer.from(ndjson, "utf8");

    const sourceName = `${zone}-${Date.now()}`;
    const uploadUrl = `https://api.mapbox.com/tilesets/v1/sources/${MAPBOX_USERNAME}/${sourceName}?access_token=${MAPBOX_ACCESS_TOKEN}`;
    const formData = new FormData();

    formData.append("file", uploadBuffer, {
        filename: file.originalname.replace(".json", ".geojson"),
        contentType: file.mimetype
    });

    const uploadRes = await axios.post(uploadUrl, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
    });

    console.log(uploadRes.data.id)
    const idField =
        zone === "ward"
            ? "ma_xa"
            : zone === "province"
                ? "ma_tinh"
                : zone === "region"
                    ? "ma_vung"
                    : "ma_sz"
    const recipe = {
        version: 1,
        layers: {
            [zone]: {
                source: uploadRes.data.id,
                minzoom: 0,
                maxzoom: 12,
                features: {
                    id: ["get", idField],
                    simplification: 0
                }
            },
        },
        incremental: true,
    };

    const tilesetUrl = `https://api.mapbox.com/tilesets/v1/${tilesetId}?access_token=${MAPBOX_ACCESS_TOKEN}`;
    const tilesetRes = await axios.post(
        tilesetUrl,
        { recipe, name: zone },
    );

    const publishUrl = `https://api.mapbox.com/tilesets/v1/${tilesetId}/publish?access_token=${MAPBOX_ACCESS_TOKEN}`;

    const publishRes = await axios.post(publishUrl);

    return publishRes.data.jobId
}


export const updateTileMapBox = async (features: any[], zone: ZoneType, file: Express.Multer.File, tilesetId: string): Promise<string> => {
    const MAPBOX_USERNAME = process.env.MAPBOX_USERNAME;
    const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;
    console.log("log: UpdateTileService")


    const ndjson = features.map((f: any) => JSON.stringify(f)).join("\n");
    const uploadBuffer = Buffer.from(ndjson, "utf8");

    const changesetName = `${zone}-changeset-${Date.now()}`;
    const uploadUrl = `https://api.mapbox.com/tilesets/v1/changesets/${MAPBOX_USERNAME}/${changesetName}?access_token=${MAPBOX_ACCESS_TOKEN}`;

    const formData = new FormData();
    formData.append("file", uploadBuffer, {
        filename: file.originalname.replace(".json", ".geojson"),
        contentType: file.mimetype,
    });

    // Upload NDJSON làm changeset source
    const uploadRes = await axios.post(uploadUrl, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
    });

    console.log("Changeset uploaded:", uploadRes);


    const publishUrl = `https://api.mapbox.com/tilesets/v1/${tilesetId}/publish-changesets?access_token=${MAPBOX_ACCESS_TOKEN}`;
    const publishBody = {
        layers: {
            [zone]: {
                changeset: uploadRes.data.id,
            },
        },
    };

    const publishRes = await axios.post(publishUrl, publishBody);
    console.log("🚀 Changeset publish started:", publishRes.data.message);

    return publishRes.data.jobId
}