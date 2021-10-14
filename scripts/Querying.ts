import { getService } from "azure-devops-extension-sdk";
import { ILinkProps } from "azure-devops-ui/Link";
import { IFilterState } from "azure-devops-ui/Utilities/Filter";

import {
    CommonServiceIds,
    getClient,
    IProjectInfo,
    IProjectPageService
} from "azure-devops-extension-api/Common";

import {
    GitPullRequest,
    GitRepository,
    GitRestClient
} from "azure-devops-extension-api/Git";

import {
    IdentitiesGetConnectionsResponseModel,
    IdentitiesSearchRequestModel,
    IdentityServiceIds,
    IIdentity,
    IPeoplePickerProvider,
    IVssIdentityService
} from "azure-devops-extension-api/Identities";

import { createQueryCriteria } from "./Filtering";

export class IdentityPickerProvider implements IPeoplePickerProvider {

    public readonly identityService: Promise<IVssIdentityService>;

    constructor() {
        this.identityService = getService<IVssIdentityService>(IdentityServiceIds.IdentityService);
    }

    public async addIdentitiesToMRU(identities: IIdentity[]) : Promise<boolean> {
        const identityService = await this.identityService;
        return await identityService.addMruIdentitiesAsync(identities);
    };

    public async removeIdentitiesFromMRU(identities: IIdentity[]) : Promise<boolean> {
        const identityService = await this.identityService;
        return await identityService.removeMruIdentitiesAsync(identities);
    };

    public async getEntityFromUniqueAttribute(entityId: string): Promise<IIdentity> {
        const identityService = await this.identityService;
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
        const identityService = await this.identityService;
        return await identityService.getConnections(entity, getDirectReports);
    };

    public async onEmptyInputFocusEnforced(): Promise<IIdentity[]> {
        const identityService = await this.identityService;
        return await identityService.getIdentityMruAsync();
    }

    private async onSearchPersona(searchText: string, items: IIdentity[]): Promise<IIdentity[]> {
        const searchRequest: IdentitiesSearchRequestModel = { query: searchText };
        const identityService = await this.identityService;
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

export async function loadProject(): Promise<IProjectInfo> {
    const projectService = await getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();
    if (project === undefined) {
        throw "Unknown loading context.";
    }

    return project;
}

export async function loadRepos(projectId?: string): Promise<GitRepository[]> {
    return await getClient(GitRestClient).getRepositories(projectId, true);
}

export async function loadPullRequests(
    filterState: IFilterState,
    skip: number,
    take: number
): Promise<{
    pullRequests: GitPullRequest[];
    responseCount: number;
}> {
    const projectService = await getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();
    const projectId = project!.id;
    const queryCriteria = createQueryCriteria(filterState);

    const pullRequests = await getClient(GitRestClient).getPullRequestsByProject(
        projectId,
        queryCriteria.criteria,
        undefined,
        skip,
        take
    );

    const displayPrs = pullRequests.filter(queryCriteria.localFilter);

    displayPrs.forEach(pr => {
        const linkProps: ILinkProps = {
            rel: 'noreferrer',
            target: '_blank',
            href: pr.url.replace("/_apis/git/repositories/", "/_git/")
                .replace("/pullRequests/", "/pullrequest/")
                .replace(`/${pr.repository.id}/`, `/${pr.repository.name}/`)
                .replace(`/${pr.repository.project.id}/`, `/${pr.repository.project.name}/`)
        };

        pr['linkProps'] = linkProps;
    });

    return {
        pullRequests: displayPrs,
        responseCount: pullRequests.length
    };
}
