import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DevOps from "azure-devops-extension-sdk";
import { GitPullRequest, GitPullRequestSearchCriteria, GitRepository, GitRestClient } from "azure-devops-extension-api/Git";
import { CommonServiceIds, IProjectInfo, IProjectPageService } from "azure-devops-extension-api/Common";
import { IIdentity } from "azure-devops-extension-api/Identities";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import { Page } from "azure-devops-ui/Page";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import "azure-devops-ui/Core/override.css";

import { PullRequestFilterBar, loadRepos, loadProject, updateFilter } from "./PullRequestFilterBar";
import { WidgetHeader } from "./PullRequestHeader";
import { PullRequestTable } from "./PullRequestTable";
import { statusDisplayMappings } from "./status";

interface IAppState {
    repos: GitRepository[];
    pullRequests: GitPullRequest[];
    project: IProjectInfo;
    creatorIdentity: ObservableValue<IIdentity | undefined>;
    reviewerIdentity: ObservableValue<IIdentity | undefined>;
    filterLoaded: boolean;
    pullRequestLoading: boolean;
    requestedPullRequestsLength: number;
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
            repos: [],
            pullRequests: [],
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
            <WidgetHeader />
            <div className="page-content page-content-top">
                {this.state.filterLoaded && (
                    <PullRequestFilterBar
                        filter={this.filter}
                        repos={this.state.repos}
                        creatorIdentity={this.state.creatorIdentity}
                        reviewerIdentity={this.state.reviewerIdentity}
                    />
                )}
                <div id="pull-request-search-container">
                    <div id="message">Loading repository metadata...</div>
                    <div id="results">
                        <PullRequestTable
                            pullRequests={this.state.pullRequests}
                        />
                    </div>
                </div>
                <div id="pull-request-contents-search-container" hidden>
                    <div className="input-controls">
                        <div className="bowtie">
                            <button className="back-button cta" aria-label="Back">Back</button>
                        </div>
                        <div>
                            <label>Search</label>
                            <div className="contents-search"></div>
                        </div>
                        <div className="bowtie">
                            <button className="search-button cta" aria-label="Search">Search</button>
                        </div>
                    </div>
                    <a className="contents-title" rel="noreferrer" target="_blank"></a>
                    <div id="contents-message"></div>
                    <div id="contents-results"></div>
                </div>
            </div>
        </Page>
    )}

    public async componentDidMount() {
        await DevOps.init();

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
            this.state.reviewerIdentity);

        this.setState({
            ...this.state,
            filterLoaded: true
        });

        await DevOps.ready();
        this.queryFromRest(false);
    }

    public queryFromRest = async (append: boolean): Promise<void> => {
        if (append && this.state.requestedPullRequestsLength > this.state.pullRequests.length) {
            return;
        }

        const projectService = await DevOps.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
        const project = await projectService.getProject();
        const projectId = project!.id;
        const filterState = this.filter.getState();

        const criteria = {
            includeLinks: true,
            status: statusDisplayMappings.All,
        };

        if ('status' in filterState) {
            const value = filterState['status']!.value as string[];
            if (value.length === 1) {
                criteria['status'] = statusDisplayMappings[value[0]];
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

        const gitClient = new GitRestClient({ rootPath: 'https://dev.azure.com/tlylz/' });
        const pullRequests = await gitClient.getPullRequestsByProject(
            projectId,
            criteria as GitPullRequestSearchCriteria,
            undefined,
            append ? this.state.requestedPullRequestsLength : 0,
            100);

        if (append) {
            this.setState({
                ...this.state,
                pullRequests: [...this.state.pullRequests, ...pullRequests],
                requestedPullRequestsLength: this.state.requestedPullRequestsLength + 100,
            });
        } else {
            this.setState({
                ...this.state,
                pullRequests: pullRequests,
                requestedPullRequestsLength: 100,
            });
        }
    }
}

ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
        <PullRequestSearchApp />
    </SurfaceContext.Provider>,
    document.getElementById('root')
);
