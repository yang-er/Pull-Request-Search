import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DevOps from "azure-devops-extension-sdk";
import { CommonServiceIds, IGlobalMessagesService, IProjectInfo } from "azure-devops-extension-api/Common";
import { GitPullRequest, GitRepository } from "azure-devops-extension-api/Git";
import { IIdentity } from "azure-devops-extension-api/Identities";
import { Page } from "azure-devops-ui/Page";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { Spinner, SpinnerSize } from "azure-devops-ui/Spinner";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import { IReadonlyObservableValue, ObservableArray, ObservableValue } from "azure-devops-ui/Core/Observable";
import "azure-devops-ui/Core/override.css";

import * as Querying from "./Querying";
import * as Filtering from "./Filtering";
import { PluginFilterBar, PluginHeader, PluginTable } from "./Displaying";

interface IAppState {
    repos: GitRepository[];
    project: IProjectInfo;
    filterLoaded: boolean;
}

class PullRequestSearchApp extends React.Component<{}, IAppState> {

    private readonly filter = new Filter();
    private readonly identityProvider = new Querying.IdentityPickerProvider();
    private readonly requestedLength = new ObservableValue(0);
    private readonly responsedLength = new ObservableValue(0);
    private readonly pullRequestLoading = new ObservableValue(false);
    private readonly hasPrValue = new ObservableValue(true);
    private readonly creatorIdentity = new ObservableValue<IIdentity | undefined>(undefined);
    private readonly reviewerIdentity = new ObservableValue<IIdentity | undefined>(undefined);
    private readonly lastUpdateTimes = new ObservableArray<Date>([]);
    private readonly displayPullRequests = new ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>([
        new ObservableValue<GitPullRequest | undefined>(undefined)
    ]);

    constructor() {
        super({});
        this.state = {
            repos: [],
            filterLoaded: false,
            project: { id: '', name: '' }
        };
    }

    public render() {
        return (
            <Page
                className="flex-grow custom-scrollbar scroll-auto-hide sample-page"
            >
                <PluginHeader
                    onRefreshActivate={() => {
                        this.lastUpdateTimes.removeAll();
                        this.pullRequestLoading.value || this.queryFromRest(false);
                    }}
                />
                {this.state.filterLoaded ? (
                    <div
                        className="page-content page-content-top"
                    >
                        <PluginFilterBar
                            filter={this.filter}
                            repos={this.state.repos}
                            creatorIdentity={this.creatorIdentity}
                            reviewerIdentity={this.reviewerIdentity}
                            pickerProvider={this.identityProvider}
                        />
                        <PluginTable
                            pullRequests={this.displayPullRequests}
                            hasValue={this.hasPrValue}
                            shouldAutoLoadMore={() => this.lastUpdateTimes.length < 10}
                            loadMore={force => {
                                force && this.lastUpdateTimes.removeAll();
                                this.pullRequestLoading.value || this.queryFromRest(true);
                            }}
                        />
                    </div>
                ) : (
                    <div className="flex-column flex-grow">
                        <div className="flex-grow" />
                        <Spinner label="loading..." size={SpinnerSize.large} />
                        <div className="flex-grow" style={{ flexGrow: 2 }} />
                    </div>
                )}
            </Page>
        );
    }

    public async componentDidMount() {
        await DevOps.init({
            loaded: false
        });

        const project = await Querying.loadProject();
        const repos = await Querying.loadRepos(project.id);

        await Filtering.updateFilter(
            this.filter,
            repos,
            this.creatorIdentity,
            this.reviewerIdentity,
            () => {
                this.lastUpdateTimes.removeAll();
                this.pullRequestLoading.value || this.queryFromRest(false);
            }
        );

        this.setState({
            project,
            repos,
            filterLoaded: true
        });

        await DevOps.notifyLoadSucceeded();
        await DevOps.ready();
    }

    public queryFromRest = async (append: boolean): Promise<void> => {
        if (!this.state.filterLoaded) {
            return;
        }

        let requestedLength = this.requestedLength.value;
        let responsedLength = this.responsedLength.value;
        if (append && requestedLength > responsedLength) {
            return;
        }

        this.pullRequestLoading.value = true;
        const displayPullRequests = this.displayPullRequests;
        if (!append) {
            displayPullRequests.removeAll();
            displayPullRequests.push(new ObservableValue<GitPullRequest | undefined>(undefined));
            requestedLength = responsedLength = 0;
        }

        const result = await Querying.loadPullRequests(
            this.state.repos,
            this.filter.getState(),
            requestedLength,
            100
        );

        displayPullRequests.pop();
        displayPullRequests.push(...result.pullRequests);
        responsedLength += result.responseCount;
        requestedLength += 100;
        this.responsedLength.value = responsedLength;
        this.requestedLength.value = requestedLength;

        const realPrs = displayPullRequests.length;
        if (requestedLength === responsedLength) {
            displayPullRequests.push(new ObservableValue<GitPullRequest | undefined>(undefined));
        }

        this.hasPrValue.value = displayPullRequests.length !== 0;
        this.lastUpdateTimes.push(new Date());
        this.pullRequestLoading.value = false;
        const globalMessagesSvc = await DevOps.getService<IGlobalMessagesService>(CommonServiceIds.GlobalMessagesService);
        globalMessagesSvc.addToast({
            duration: 5000,
            message: `${realPrs}/${responsedLength} pull requests match title, date and status criteria.`,
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
