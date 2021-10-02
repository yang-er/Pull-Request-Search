import { IdentityRef } from "azure-devops-extension-api/WebApi";
import { GitPullRequest } from "azure-devops-extension-api/Git";

function getIdentitiesInPr(pr: GitPullRequest): IdentityRef[] {
    return [
        pr.createdBy,
        ...pr.reviewers,
    ];
}

export function identitiesInPrs(prs: GitPullRequest[]): IdentityRef[] {
    const identityMap: {[id: string]: IdentityRef} = {};
    for (const pr of prs) {
        for (const ident of getIdentitiesInPr(pr)) {
            identityMap[ident.id] = ident;
        }
    }
    return Object.keys(identityMap).map(id => identityMap[id]);
}
