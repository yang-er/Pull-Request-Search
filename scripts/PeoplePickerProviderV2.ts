import { CachedValue } from "./caching/cachedValue";
import { getService } from "azure-devops-extension-sdk";
import {
    IdentitiesGetConnectionsResponseModel,
    IdentitiesSearchRequestModel,
    IdentityServiceIds,
    IIdentity,
    IPeoplePickerProvider,
    IVssIdentityService
} from "azure-devops-extension-api/Identities";

export { IPeoplePickerProvider };

export class PeoplePickerProviderV2 implements IPeoplePickerProvider {

    public readonly identityService = new CachedValue<IVssIdentityService>(
        () => getService<IVssIdentityService>(IdentityServiceIds.IdentityService)
    );

    public async addIdentitiesToMRU(identities: IIdentity[]) : Promise<boolean> {
        const identityService = await this.identityService.getValue();
        return await identityService.addMruIdentitiesAsync(identities);
    };

    public async removeIdentitiesFromMRU(identities: IIdentity[]) : Promise<boolean> {
        const identityService = await this.identityService.getValue();
        return await identityService.removeMruIdentitiesAsync(identities);
    };

    public async getEntityFromUniqueAttribute(entityId: string): Promise<IIdentity> {
        const identityService = await this.identityService.getValue();
        const x = await identityService.searchIdentitiesAsync(entityId, undefined, undefined, "uid");
        return x[0];
    };

    public async onEmptyInputFocus(): Promise<IIdentity[]> {
        const timeout = new Promise<void>((resolve, reject) => setTimeout(() => resolve(), 150));
        const result = await this.onEmptyInputFocusEnforced();
        await timeout;
        return result;
    }

    public onFilterIdentities(filter: string, selectedItems?: IIdentity[]): Promise<IIdentity[]> {
        return this.onSearchPersona(filter, selectedItems ? selectedItems : []);
    };

    public async onRequestConnectionInformation(
        entity: IIdentity,
        getDirectReports?: boolean)
        : Promise<IdentitiesGetConnectionsResponseModel>
    {
        const identityService = await this.identityService.getValue();
        return await identityService.getConnections(entity, getDirectReports);
    };

    public async onEmptyInputFocusEnforced(): Promise<IIdentity[]> {
        const identityService = await this.identityService.getValue();
        return await identityService.getIdentityMruAsync();
    }

    private async onSearchPersona(searchText: string, items: IIdentity[]): Promise<IIdentity[]> {
        const searchRequest: IdentitiesSearchRequestModel = { query: searchText };
        const identityService = await this.identityService.getValue();
        const identities = await identityService.searchIdentitiesAsync(
            searchRequest.query,
            searchRequest.identityTypes,
            searchRequest.operationScopes,
            searchRequest.queryTypeHint,
            searchRequest.options
        );

        return identities.filter(
            identity => !items.some(
                selectedIdentity => selectedIdentity.entityId === identity.entityId));
    };
}
