import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DevOps from "azure-devops-extension-sdk";
import { GitRepository } from "azure-devops-extension-api/Git";
import { IProjectInfo } from "azure-devops-extension-api/Common";
import { IIdentity } from "azure-devops-extension-api/Identities";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { ObservableValue } from "azure-devops-ui/Core/Observable";
import "azure-devops-ui/Core/override.css";

import { PullRequestFilterBar, loadRepos, loadProject, updateFilter } from "./PullRequestFilterBar";

interface IAppState {
  repos: GitRepository[];
  project: IProjectInfo;
  creatorIdentity: ObservableValue<IIdentity | undefined>;
  reviewerIdentity: ObservableValue<IIdentity | undefined>;
  filterLoaded: boolean;
}

class PullRequestSearchApp extends React.Component<{}, IAppState> {

  private commandBarItems : IHeaderCommandBarItem[] = [
    {
      iconProps: { iconName: 'Refresh' },
      id: 'refresh-page',
      text: 'Refresh',
      isPrimary: true,
    },
    {
      id: 'write-review',
      text: 'Write a review',
      href: 'https://marketplace.visualstudio.com/items?itemName=ottostreifel.pull-request-search',
      target: '_blank',
      important: false,
    },
    {
      id: 'report-issue',
      text: 'Report an issue',
      href: 'https://github.com/ostreifel/Pull-Request-Search/issues',
      target: '_blank',
      important: false,
    },
    {
      id: 'feedback-questions',
      text: 'Feedback and questions',
      href: 'mailto:prsearchextension@microsoft.com',
      target: '_blank',
      important: false,
    }
  ];

  private filter : Filter;

  constructor() {
    super({});
    this.filter = new Filter();
    this.state = {
      filterLoaded: false,
      repos: [],
      creatorIdentity: new ObservableValue<IIdentity | undefined>(undefined),
      reviewerIdentity: new ObservableValue<IIdentity | undefined>(undefined),
      project: {
        id: '',
        name: ''
      }
    };
  }

  public render() {
    return (
      <Page className="flex-grow custom-scrollbar scroll-auto-hide sample-page">

        <Header
            title="Pull Request Search"
            commandBarItems={this.commandBarItems}
            titleSize={TitleSize.Large}
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

<div id="pull-request-search-container">
    <div id="message">Loading repository metadata...</div>
    <div id="results"></div>
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
    );
  }

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
  }
}

ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
        <PullRequestSearchApp />
    </SurfaceContext.Provider>,
    document.getElementById('root')
);
