import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DevOps from "azure-devops-extension-sdk";
import { GitPullRequest, GitPullRequestSearchCriteria, GitRepository, GitRestClient } from "azure-devops-extension-api/Git";
import { CommonServiceIds, getClient, IGlobalMessagesService, IProjectInfo, IProjectPageService } from "azure-devops-extension-api/Common";
import { IIdentity } from "azure-devops-extension-api/Identities";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import { Page } from "azure-devops-ui/Page";
import { ILinkProps } from "azure-devops-ui/Link";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { IReadonlyObservableValue, ObservableArray, ObservableValue } from "azure-devops-ui/Core/Observable";
import "azure-devops-ui/Core/override.css";

import { PullRequestFilterBar, loadRepos, loadProject, updateFilter } from "./PullRequestFilterBar";
import { WidgetHeader } from "./PullRequestHeader";
import { PullRequestTable } from "./PullRequestTable";
import { computeStatus, ensureStatus, statusDisplayMappings } from "./status";

interface IAppState {
    repos: GitRepository[];
    displayPullRequests: ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>;
    project: IProjectInfo;
    creatorIdentity: ObservableValue<IIdentity | undefined>;
    reviewerIdentity: ObservableValue<IIdentity | undefined>;
    filterLoaded: boolean;
    pullRequestLoading: boolean;
    requestedPullRequestsLength: number;
    responsedPullRequestsLength: number;
}

class PullRequestSearchApp extends React.Component<{}, IAppState> {

    private filter : Filter;

    constructor() {
        super({});
        this.filter = new Filter();
        this.state = {
            filterLoaded: false,
            pullRequestLoading: true,
            requestedPullRequestsLength: 0,
            responsedPullRequestsLength: 0,
            repos: [],
            displayPullRequests: new ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>([new ObservableValue<GitPullRequest | undefined>(undefined)]),
            creatorIdentity: new ObservableValue<IIdentity | undefined>(undefined),
            reviewerIdentity: new ObservableValue<IIdentity | undefined>(undefined),
            project: {
                id: '',
                name: ''
            }
        };
    }

    public render() { return (
        <Page className="flex-grow custom-scrollbar scroll-auto-hide sample-page">
            <WidgetHeader
                onRefresh={() => this.queryFromRest(false)}
            />
            <div className="page-content page-content-top">
                {this.state.filterLoaded && (
                    <PullRequestFilterBar
                        filter={this.filter}
                        repos={this.state.repos}
                        creatorIdentity={this.state.creatorIdentity}
                        reviewerIdentity={this.state.reviewerIdentity}
                    />
                )}
                <PullRequestTable
                    pullRequests={this.state.displayPullRequests}
                    loadMore={() => {
                        if (!this.state.pullRequestLoading) {
                            this.queryFromRest(true);
                        }
                    }}
                />
            </div>
        </Page>
    )}

    public async componentDidMount() {
        await DevOps.init({
            loaded: false
        });

        const project = await loadProject();
        const repos = await loadRepos(project.id);
        
        this.setState({
            ...this.state,
            project,
            repos
        });

        await updateFilter(
            this.filter,
            repos,
            this.state.creatorIdentity,
            this.state.reviewerIdentity,
            () => this.queryFromRest(false)
        );

        this.setState({
            ...this.state,
            filterLoaded: true
        });

        await DevOps.notifyLoadSucceeded();
        await DevOps.ready();
        this.queryFromRest(false);
    }

    public queryFromRest = async (append: boolean): Promise<void> => {
        if (append && this.state.requestedPullRequestsLength > this.state.responsedPullRequestsLength) {
            return;
        }

        if (!append) {
            this.state.displayPullRequests.removeAll();
            this.state.displayPullRequests.push(new ObservableValue<GitPullRequest | undefined>(undefined));
            this.setState({
                ...this.state,
                responsedPullRequestsLength: 0,
                requestedPullRequestsLength: 0,
                pullRequestLoading: true,
            });
        } else {
            this.setState({
                ...this.state,
                pullRequestLoading: true,
            })
        }

        const projectService = await DevOps.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();
        const projectId = project!.id;
        const filterState = this.filter.getState();
        let postFilter: ((pr: GitPullRequest) => boolean)[] = [];

        const criteria = {
            includeLinks: true,
            status: statusDisplayMappings.All,
        };

        if ('status' in filterState) {
            const value = filterState['status']!.value as string[];
            if (value.length === 1) {
                criteria['status'] = statusDisplayMappings[value[0]];
                postFilter.push(pr => ensureStatus(pr, value[0]));
            }
        }

        if ('startDate' in filterState) {
            const value = filterState['startDate']!.value as (Date | undefined);
            if (value !== undefined) {
                postFilter.push(pr => pr.creationDate.getTime() >= value.getTime());
            }
        }

        if ('endDate' in filterState) {
            const value = filterState['endDate']!.value as (Date | undefined);
            if (value !== undefined) {
                postFilter.push(pr => pr.creationDate.getTime() <= value.getTime());
            }
        }

        if ('creator' in filterState) {
            const value = filterState['creator']!.value as (IIdentity | undefined);
            if (value !== undefined) {
                criteria['creatorId'] = value.originId;
            }
        }

        if ('reviewer' in filterState) {
            const value = filterState['reviewer']!.value as (IIdentity | undefined);
            if (value !== undefined) {
                criteria['reviewerId'] = value.originId;
            }
        }

        if ('repo' in filterState) {
            const value = filterState['repo']!.value as string[];
            if (value.length === 1) {
                criteria['repositoryId'] = this.state.repos.filter(repo => repo.name === value[0] || repo.id === value[0])[0].id;
            }
        }

        if ('title' in filterState) {
            const value = filterState['title']!.value as (string | undefined);
            if (value !== undefined) {
                postFilter.push(pr => pr.title.toLowerCase().indexOf(value.toLowerCase()) !== -1);
            }
        }

        const gitClient = getClient(GitRestClient);
        const pullRequests = await gitClient.getPullRequestsByProject(
            projectId,
            criteria as GitPullRequestSearchCriteria,
            undefined,
            this.state.requestedPullRequestsLength,
            100);

        pullRequests.forEach(pr => {
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

        const filterFunc = postFilter.length > 0 ? postFilter.reduce((prev, next) => pr => prev(pr) && next(pr)) : pr => true;
        const displayPrs = pullRequests.filter(filterFunc);

        this.state.displayPullRequests.pop();
        this.state.displayPullRequests.push(...displayPrs);
        this.setState({
            ...this.state,
            responsedPullRequestsLength: this.state.responsedPullRequestsLength + pullRequests.length,
            requestedPullRequestsLength: this.state.requestedPullRequestsLength + 100,
            pullRequestLoading: false,
        });

        const realPrs = this.state.displayPullRequests.length;
        if (this.state.requestedPullRequestsLength === this.state.responsedPullRequestsLength) {
            this.state.displayPullRequests.push(new ObservableValue<GitPullRequest | undefined>(undefined));
        }

        const globalMessagesSvc = await DevOps.getService<IGlobalMessagesService>(CommonServiceIds.GlobalMessagesService);
        globalMessagesSvc.addToast({
            duration: 5000,
            message: `${realPrs}/${this.state.responsedPullRequestsLength} pull requests match title, date and status criteria.`,
            forceOverrideExisting: true
        });
    }
}

ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
        <PullRequestSearchApp />
    </SurfaceContext.Provider>,
    document.getElementById('root')
);
