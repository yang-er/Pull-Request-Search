import * as React from "react";
import * as DevOps from "azure-devops-extension-sdk";
import { GitPullRequest, GitRepository, PullRequestAsyncStatus } from "azure-devops-extension-api/Git";
import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { IIdentityDetailsProvider, VssPersona } from "azure-devops-ui/VssPersona";
import { IdentityRef } from "azure-devops-extension-api/WebApi";
import { CommonServiceIds, IHostNavigationService } from "azure-devops-extension-api";
import { computeStatus } from "./status";
import { Icon } from "azure-devops-ui/Icon";
import { css } from "azure-devops-ui/Util";

function Persona(props: { identity: IdentityRef, vote?: number }) {
    const provider: IIdentityDetailsProvider = {
        getDisplayName() {
            return props.identity.displayName;
        },
        getIdentityImageUrl(size) {
            if ('avatar' in props.identity._links) {
                return props.identity._links.avatar.href as string;
            } else {
                return undefined;
            }
        }
    };

    if (props.vote !== undefined && props.vote !== 0) {
        const { iconName, className } =
            props.vote === -5 ? { iconName: "AwayStatus", className: "waiting" }
            : props.vote === -10 ? { iconName: "StatusErrorFull", className: "rejected" }
            : { iconName: "CompletedSolid", className: "approved" };
        return (
            <div className="relative">
                <VssPersona identityDetailsProvider={provider} size="small" />
                <Icon iconName={iconName} className={css("repos-pr-reviewer-vote absolute", className)} />
            </div>
        );
    } else {
        return (
            <VssPersona identityDetailsProvider={provider} size="medium" />
        );
    }
}

export interface IPullRequestRowProps {
    repository: GitRepository;
    pullRequest: GitPullRequest;
}

export function PullRequestRow(props: IPullRequestRowProps) {
    const { pullRequest: pr, repository } = props;

    const targetName = pr.targetRefName.replace("refs/heads/", "");
    const url = pr.url.replace("/_apis/git/repositories/", "/_git/")
        .replace("/pullRequests/", "/pullrequest/")
        .replace(`/${repository.id}/`, `/${repository.name}/`)
        .replace(`/${repository.project.id}/`, `/${repository.project.name}/`);

    return (
        <tr className="pr-row">
            <td>
                <Persona identity={pr.createdBy} />
            </td>
            <td>
                <a href={url} target={"_blank"} rel={"noreferrer"} onClick={ev => {
                    ev.stopPropagation();
                    ev.preventDefault();
                    DevOps.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService).then(svc => {
                        svc.openNewWindow(url, "");
                    });
                }}>{pr.title}</a>
                <div>{`${pr.createdBy.displayName} requested !${pr.pullRequestId} into ${targetName} ${pr.creationDate}`}</div>
                {pr.mergeStatus === PullRequestAsyncStatus.Conflicts ? <div className="conflicts">Conflicts</div> : null}
            </td>
            <td className="column-pad-right">
                {computeStatus(pr)}
            </td>
            <td className="column-pad-right">
                {pr.repository.name}
            </td>
            <td>
                {pr.reviewers.map(reviewer => (
                    <Persona identity={reviewer} vote={reviewer.vote} />
                ))}
            </td>
        </tr>
    );
}

export interface IPullRequestTableProps {
    pullRequests: GitPullRequest[];
}

export function PullRequestTable(props: IPullRequestTableProps) {
    if (props.pullRequests.length === 0) {
        return (
            <ZeroData
                primaryText="This is the primary text"
                secondaryText={
                    <span>
                        This secondary text contains a{" "}
                        <a
                            rel="nofollow noopener"
                            target="_blank"
                            href="https://bing.com"
                            aria-label="link to bing.com"
                        >
                            link
                        </a>{" "}
                        to somewhere else. Lorem ipsum dolor sit amet, consectetur adipiscing
                        elit.
                    </span>
                }
                imageAltText="Bars"
                imagePath="https://cdn.vsassets.io/ext/ms.vss-code-web/pr-list/Content/emptyPRList.e7LLYcW6Lt_C0mQv.svg"
                actionText="Button"
                actionType={ZeroDataActionType.ctaButton}
                onActionClick={(event, item) =>
                    alert("Hey, you clicked the button for " + item!.primaryText)
                }
            />
        )
    } else {
        return (
            <table>
                <tbody>
                    {props.pullRequests.map(pullRequest => (
                        <PullRequestRow
                            pullRequest={pullRequest}
                            repository={pullRequest.repository}
                        />
                    ))}
                </tbody>
            </table>
        );
    }
}
