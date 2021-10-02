import * as ExtensionCache from "../caching/extensionCache";
import { IImageLookup, createLookup } from "./images";
import { CachedValue } from "../caching/cachedValue";

interface IImageDocument {
    lookup: IImageLookup;
    version: number;
}
const key = "image-lookup";
const validDays = 30;
function store(lookup: IImageDocument): Promise<void> {
    const expiration = new Date();
    expiration.setDate(expiration.getDate() + validDays);
    return ExtensionCache.store(key, lookup, expiration);
}

const version = 2;
function fromDocument(doc: IImageDocument): IImageLookup | null {
    if (doc.version !== version) {
        return null;
    }
    return doc.lookup;
}
function toDocument(lookup: IImageLookup, expiration: Date | null) {
    if (!expiration) {
        expiration = new Date();
        expiration.setDate(expiration.getDate() + validDays);
    }
    const document: IImageDocument = {
        lookup,
        version,
    };
    return document;
}

function findMissingIds(lookup: IImageLookup, uniquenames: string[]): string[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validDays);
    return uniquenames.filter(name => !(name in lookup) || new Date(lookup[name].cachedDate) < cutoffDate);
}

function hardGet(missingIds: string[], known: IImageLookup): Promise<IImageLookup> {
    return createLookup(missingIds).then((missingLookups) => {
        const newLookup: IImageLookup = {
            ...(known || {}),
            ...missingLookups,
        };
        store(toDocument(newLookup, null));
        const str = JSON.stringify(newLookup);
        return newLookup;
    });
}

function getFromExtensionStorage(uniquenames: string[]): Promise<IImageLookup> {
    return ExtensionCache.get<IImageDocument>(key).then((images): IImageLookup | Promise<IImageLookup> => {
        const lookup: IImageLookup | null = images ? fromDocument(images) : null;
        const missingIds = lookup ? findMissingIds(lookup, uniquenames) : uniquenames;
        if (missingIds.length === 0) {
            return lookup || {};
        }
        return hardGet(missingIds, {}).then(lookup => lookup, () => lookup || {});
    });
}

let lastLookup = new CachedValue<IImageLookup>(() => Promise.resolve<IImageLookup>({}));
export function get(uniquenames: string[]): Promise<IImageLookup> {
    const prev = lastLookup;
    lastLookup = new CachedValue<IImageLookup>(() => prev.getValue().then((lastLookup) => {
        const missingIds = findMissingIds(lastLookup, uniquenames);
        if (missingIds.length === 0) {
            return Promise.resolve(lastLookup);
        }
        if (Object.keys(lastLookup).length === 0) {
            return getFromExtensionStorage(uniquenames);
        }
        return hardGet(missingIds, lastLookup).then(lookup => lookup, () => lastLookup);
    }));
    return lastLookup.getValue();
}
