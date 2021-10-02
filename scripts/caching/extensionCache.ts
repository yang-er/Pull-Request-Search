import { CommonServiceIds, IExtensionDataManager, IExtensionDataService } from "azure-devops-extension-api";
import { VssServerError } from "azure-devops-extension-api/Common/Fetch"
import { getAccessToken, getExtensionContext, getService, getUser } from "azure-devops-extension-sdk";
import { CachedValue } from "./cachedValue";

const collection = "extension-cache";
const service = new CachedValue<IExtensionDataManager>(async () => {
    const service : IExtensionDataService = await getService(CommonServiceIds.ExtensionDataService);
    const accessToken = await getAccessToken();
    const extensionId = getExtensionContext().extensionId;
    return service.getExtensionDataManager(extensionId, accessToken);
});

interface IExtensionCacheEntry<T> {
    id: string;
    value: T;
    formatVersion: number;
    expiration: string;
    __etag: -1;
}

const formatVersion = 2;

export function store<T>(key: string, value: T, expiration?: Date): Promise<void> {
    const entry: IExtensionCacheEntry<T> = {
        id: key,
        value,
        formatVersion,
        expiration: expiration ? expiration.toJSON() : "",
        __etag: -1,
    };
    return service.getValue().then((dataService): Promise<void> =>
        dataService.setDocument(collection, entry).then(() => undefined)
    );
}

export function get<T>(key: string): Promise<T | null> {
    return service.getValue().then(dataService => {
        return dataService.getDocument(collection, key).then((doc: IExtensionCacheEntry<T>) => {
            if (doc.formatVersion !== formatVersion) {
                return null;
            }
            if (doc.expiration && new Date(doc.expiration) < new Date()) {
                return null;
            }
            return doc.value;
        }, (error: VssServerError): T | null => {
            const status = Number(error.status);
            // If collection has not been created yet;
            if (status === 404 ||
                // User does not have permissions
                status === 401) {
                return null;
            }
            throw error;
        });
    });
}
