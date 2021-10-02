import { VssServerError } from "azure-devops-extension-api/Common/Fetch";
import { getAccessToken } from "azure-devops-extension-sdk";

export function callApi(url: string,
                        method: string,
                        headers: {[header: string]: string} | undefined,
                        data: any | undefined,
                        success: (response) => void,
                        failure: (error: VssServerError, errorThrown: string, status: number) => void, ajaxSettings: Partial<JQueryAjaxSettings> = {}) {
    getAccessToken().then((sessionToken) => {
        const authorizationHeaderValue = sessionToken ? "Bearer " + sessionToken : '';
        $.ajax({
            ...ajaxSettings,
            url: url,
            method: method,
            data: data || "",
            success: function (data, textStatus, jqueryXHR) {
                success(data);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                if (jqXHR.responseJSON || 401 !== jqXHR.status && 403 !== jqXHR.status) {
                    if (jqXHR.responseJSON) {
                        failure(jqXHR.responseJSON, errorThrown, jqXHR.status);
                    } else {
                        failure({name: "CallFailure", message: "call failed with status code " + jqXHR.status, status: jqXHR.status, responseText: ''}, errorThrown, jqXHR.status);
                    }
                } else {
                    failure({name: "AuthorizationFailure", message: "unauthorized call", status: jqXHR.status, responseText: ''}, errorThrown, jqXHR.status);
                }
            },
            beforeSend: function (jqXHR) {
                jqXHR.setRequestHeader("Authorization", authorizationHeaderValue);
                if (headers) {
                    for (const header in headers) {
                        jqXHR.setRequestHeader(header, headers[header]);
                    }
                }
            }
        } as JQueryAjaxSettings);
    });
}

export function binaryCall(url: string, method: string, success: (data: Uint8Array, contentType: string) => void) {
    getAccessToken().then((sessionToken) => {
        const authorizationHeaderValue = sessionToken ? "Bearer " + sessionToken : '';
        const oReq = new XMLHttpRequest();
        oReq.open(method, url, true);
        oReq.responseType = "arraybuffer";
        oReq.setRequestHeader("Authorization", authorizationHeaderValue);

        oReq.onload = function (oEvent) {
            const arrayBuffer = oReq.response;

            // if you want to access the bytes:
            const byteArray = new Uint8Array(arrayBuffer);
            const contentType = oReq.getResponseHeader("Content-Type")!;
            success(byteArray, contentType);
        };

        oReq.send();
    });
}
