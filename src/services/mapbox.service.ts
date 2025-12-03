import axios from "axios";


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
