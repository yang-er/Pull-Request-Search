import * as Q from "q";
import { IImageLookup } from "./images";
import { getIdentities } from "./getIdentities";
import * as ImageStorage from "./imageStorage";
import { IdentityRef } from "azure-devops-extension-api/WebApi";
import { CachedValue } from "../caching/cachedValue";

export class ImageUrlMapper {
    public static create(identities: IdentityRef[], timeout: number): Promise<ImageUrlMapper> {
        return new Promise<ImageUrlMapper>((resolve, reject) => {
            const uniqueNames = identities.map(i => i.isContainer ? i.displayName : i.uniqueName).filter(n => !!n);
            const start = new Date().getTime();
            ImageStorage.get(uniqueNames).then((lookup) => {
                const mapper = new ImageUrlMapper(lookup);
                const end = new Date().getTime();
                console.log("elapsed", end - start);
                resolve(mapper);
            });
            // fallback if getting identities is taking too long
            setTimeout(() => {
                resolve(new ImageUrlMapper({}))
            }, timeout);
        })
    }
    constructor(
        private readonly lookup: IImageLookup,
    ) {
    }
    getImageUrl(identity: IdentityRef): string {
        const lookupKey = identity.isContainer ? identity.displayName : identity.uniqueName;
        const imgEntry = this.lookup[lookupKey];
        return imgEntry && imgEntry.dataUrl || identity.imageUrl;
    }
}