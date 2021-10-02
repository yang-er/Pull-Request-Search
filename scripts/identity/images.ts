import { throttlePromises } from "../caching/throttlePromises";
import { callApi, binaryCall } from "../RestCall";
import { IdentityServiceIds, IIdentity, IVssIdentityService } from "azure-devops-extension-api/Identities";
//import { IdentitiesSearchRequestModel, QueryTokenResultModel } from "VSS/Identities/Picker/RestClient";
//import { CommonIdentityPickerHttpClient, IEntity } from "VSS/Identities/Picker/RestClient"
//import { IdentityService } from "VSS/Identities/Picker/Services";
import { CachedValue } from "../caching/cachedValue";
import * as defaultImages from "../identity/defaultImages";
import { getService } from "azure-devops-extension-sdk";

const cache = new CachedValue(() => getService<IVssIdentityService>(IdentityServiceIds.IdentityService));
const uri = ""; //VSS.getWebContext().collection.uri;

function getEntityId(searchName: string): Promise<IIdentity> {
    const match = searchName.match(/\[.*\]\\(.*)/);
    const query = match ? match[1] : searchName;
    return cache.getValue().then(client => client.searchIdentitiesAsync(query, ['AAD', 'IMS', 'Source'], ['User', 'Group'])).then((queryResult) => 
        queryResult.filter(i => !match /*|| i.displayName === searchName*/)[0] as IIdentity
    );
}

/** get the avatar as a dataurl */
function getAvatar(entity: IIdentity): Promise<string> {
    const url = `${uri}_apis/IdentityPicker/Identities/${entity.entityId}/avatar`;
    return new Promise<string>((resolve, reject) => binaryCall(url, "GET", (response, contentType) => {
        if (response.length === 0) {
            if (entity.entityType === "Group") {
                resolve(defaultImages.groupImage);
                return;
            } else {
                resolve(defaultImages.userImage);
                return;
            }
        }
        const mimeType = contentType.match(/image\/\w+/)![0]
        const base64 = btoa(Array.prototype.map.call(response, (ch) =>
            String.fromCharCode(ch)
        ).join(''));
        const dataurl = `data:${mimeType};base64,${base64}`;
        resolve(dataurl);
    }));
}

function resizeImage(dataUrl: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        var canvas = document.createElement("canvas");
        canvas.width = 44;
        canvas.height = 44;
        var img = document.createElement("img");
        img.src = dataUrl;
        img.onload = () => {
            canvas.getContext("2d")!.drawImage(img, 0, 0, 44, 44);
            const resized = canvas.toDataURL();
            resolve(resized);
        }
    });
}

export interface IImageUrl {
    dataUrl: string;
    cachedDate: string;
}

/** Unique name (or display name if unique is unavailable) to dataurl */
export interface IImageLookup {
    [uniqueName: string]: IImageUrl;
}

export function createLookup(uniqueNames: string[]): Promise<IImageLookup> {
    return throttlePromises(
        uniqueNames,
        (uniqueName) => {
            return getEntityId(uniqueName).then(getAvatar).then(resizeImage).then((dataUrl) => [uniqueName, dataUrl]);
        },
        6
    ).then((entries): IImageLookup => {
        const map: IImageLookup = {};
        for (const [uniqueName, dataUrl] of entries) {
            map[uniqueName] = {dataUrl, cachedDate: new Date().toJSON()};
        }
        return map;
    });
}
