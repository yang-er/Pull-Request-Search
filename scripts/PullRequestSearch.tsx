import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DevOps from "azure-devops-extension-sdk";
import { CommonServiceIds, IGlobalMessagesService, IProjectInfo } from "azure-devops-extension-api/Common";
import { GitPullRequest, GitRepository } from "azure-devops-extension-api/Git";
import { IIdentity } from "azure-devops-extension-api/Identities";
import { Page } from "azure-devops-ui/Page";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import { IReadonlyObservableValue, ObservableArray, ObservableValue } from "azure-devops-ui/Core/Observable";
import "azure-devops-ui/Core/override.css";

import * as Querying from "./Querying";
import * as Filtering from "./Filtering";
import { PluginFilterBar, PluginHeader, PluginTable } from "./Displaying";

interface IAppState {
    repos: GitRepository[];
    project: IProjectInfo;
    creatorIdentity: ObservableValue<IIdentity | undefined>;
    reviewerIdentity: ObservableValue<IIdentity | undefined>;
    filterLoaded: boolean;
    pullRequestLoading: boolean;
    displayPullRequests: ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>;
    requestedPullRequestsLength: number;
    responsedPullRequestsLength: number;
}

class PullRequestSearchApp extends React.Component<{}, IAppState> {

    private filter = new Filter();
    private identityProvider = new Querying.IdentityPickerProvider();

    constructor() {
        super({});
        this.filter = new Filter();
        this.state = {
            repos: [],
            filterLoaded: false,
            pullRequestLoading: true,
            project: { id: '', name: '' },
            requestedPullRequestsLength: 0,
            responsedPullRequestsLength: 0,
            creatorIdentity: new ObservableValue<IIdentity | undefined>(undefined),
            reviewerIdentity: new ObservableValue<IIdentity | undefined>(undefined),
            displayPullRequests: new ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>([
                new ObservableValue<GitPullRequest | undefined>(undefined)
            ]),
        };
    }

    public render() {
        return (
            <Page
                className="flex-grow custom-scrollbar scroll-auto-hide sample-page"
            >
                <PluginHeader
                    onRefreshActivate={() => this.queryFromRest(false)}
                />
                <div
                    className="page-content page-content-top"
                >
                    {this.state.filterLoaded && (
                        <PluginFilterBar
                            filter={this.filter}
                            repos={this.state.repos}
                            creatorIdentity={this.state.creatorIdentity}
                            reviewerIdentity={this.state.reviewerIdentity}
                            pickerProvider={this.identityProvider}
                        />
                    )}
                    <PluginTable
                        pullRequests={this.state.displayPullRequests}
                        loadMore={() => this.state.pullRequestLoading || this.queryFromRest(true)}
                    />
                </div>
            </Page>
        );
    }

    public async componentDidMount() {
        await DevOps.init({
            loaded: false
        });

        const project = await Querying.loadProject();
        const repos = await Querying.loadRepos(project.id);

        this.setState({
            ...this.state,
            project,
            repos
        });

        await Filtering.updateFilter(
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
            });
        }

        const result = await Querying.loadPullRequests(
            this.state.repos,
            this.filter.getState(),
            this.state.requestedPullRequestsLength,
            100
        );

        this.state.displayPullRequests.pop();
        this.state.displayPullRequests.push(...result.pullRequests);
        this.setState({
            ...this.state,
            responsedPullRequestsLength: this.state.responsedPullRequestsLength + result.responseCount,
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
