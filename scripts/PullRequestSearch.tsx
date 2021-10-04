import * as React from "react";
import * as ReactDOM from "react-dom";
import * as DevOps from "azure-devops-extension-sdk";
import "azure-devops-ui/Core/override.css";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";
import { Page } from "azure-devops-ui/Page";
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { DropdownSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { Observer } from "azure-devops-ui/Observer";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { Filter, FILTER_CHANGE_EVENT, FilterOperatorType } from "azure-devops-ui/Utilities/Filter";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { IdentityPickerDropdownFilterBarItem } from "azure-devops-ui/IdentityPicker";
import { statusStrings } from "./status";
import { PeoplePickerProviderV2 } from "./PeoplePickerProviderV2";
import { DatePickerFilterBarItem } from "azure-devops-ui-datepicker";
import { GitRepository, GitRestClient } from "azure-devops-extension-api/Git";
import { IListBoxItem } from "azure-devops-ui/ListBox";
import { ArrayItemProvider, IItemProvider } from "azure-devops-ui/Utilities/Provider";
import { ObservableCollection } from "azure-devops-ui/Core/Observable";
import { CommonServiceIds, IHostNavigationService } from "azure-devops-extension-api/Common/CommonServices";

interface IAppState {
  repos: IItemProvider<IListBoxItem<GitRepository>>;
}

class PullRequestSearchApp extends React.Component<{}, IAppState> {

  private async loadRepos() {
    const navigation = await DevOps.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
    const client = new GitRestClient({
      rootPath: 'https://dev.azure.com/tlylz/namomo/'
    });

    const repositories = await client.getRepositories(undefined, true);
    const values = new ArrayItemProvider<IListBoxItem<GitRepository>>(repositories.map(repo => ({
      id: repo.id,
      text: repo.name,
      iconProps: { iconName: 'Git' },
      data: repo,
    })));

    this.setState({ ...this.state, repos: values });
    const queryItem = await navigation.getQueryParams();
    const index = values.value.findIndex(repo => 'repo' in queryItem && repo.text === queryItem['repo'] || repo.id === queryItem['repo']);
    this.repoSelect.select(index);
  }

  private async updateParam(key: string, value: string) {
    const updateParam: { [key: string]: string; } = {};
    updateParam[key] = value!;
    const navigation = await DevOps.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
    navigation.setQueryParams(updateParam);
  }

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

  private repoSelect = new DropdownSelection();
  private filter : Filter;

  private pickerProvider = new PeoplePickerProviderV2();

  constructor() {
    super({});
    this.filter = new Filter();
    this.state = {
      repos: new ArrayItemProvider([]),
    };

    this.filter.subscribe(value => {
      let updateParam: { [key: string]: string; } = {};
      Object.keys(value).forEach(ikey => {
        updateParam[ikey] = value[ikey]?.value.id;
      });
      DevOps.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService).then(svc => svc.setQueryParams(updateParam));
    }, FILTER_CHANGE_EVENT);
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

          <FilterBar filter={this.filter}>

            <KeywordFilterBarItem
                filterItemKey="title"
                placeholder="Filter by title"
            />

            <DatePickerFilterBarItem
                filterItemKey="startDate"
                filter={this.filter}
                placeholder="Start Date"
            />

            <DatePickerFilterBarItem
                filterItemKey="endDate"
                filter={this.filter}
                placeholder="End Date"
            />

            <DropdownFilterBarItem<GitRepository>
                filterItemKey="repo"
                filter={this.filter}
                items={this.state.repos}
                selection={this.repoSelect}
                showItemsWhileSearching={true}
                dismissOnSelect
                placeholder="Repo"
            />

          </FilterBar>

          <FilterBar filter={this.filter}>

            <DropdownFilterBarItem
                filterItemKey="status"
                filter={this.filter}
                items={statusStrings.map(text => ({ id: text, text })).filter(i => i.text !== "All")}
                placeholder="Status"
            />

            <IdentityPickerDropdownFilterBarItem
                filterItemKey="creator"
                filter={this.filter}
                pickerProvider={this.pickerProvider}
                editPlaceholder="Creator"
                placeholder="Creator"
            />

            <IdentityPickerDropdownFilterBarItem
                filterItemKey="reviewer"
                filter={this.filter}
                pickerProvider={this.pickerProvider}
                editPlaceholder="Reviewer"
                placeholder="Reviewer"
            />

          </FilterBar>
<div id="pull-request-search-container">
    <div className="input-controls">
        <div>
            <label>Title</label>
            <div className="title-box"></div>
        </div>
        <div className="status">
            <label>Status</label>
            <div className="status-picker"></div>
        </div>
        <div>
            <label>Creator</label>
            <div className="creator-picker"></div>
        </div>
        <div>
            <label>Reviewer</label>
            <div className="reviewer-picker"></div>
        </div>
        <div>
            <label>Start Date</label>
            <div className="start-date-box"></div>
        </div>
        <div>
            <label>End Date</label>
            <div className="end-date-box"></div>
        </div>
        <div>
            <label>Repo</label>
            <div className="repo-picker"></div>
        </div>
        <div className="bowtie">
            <button className="refresh cta" aria-label="Refresh">Refresh</button>
        </div>
    </div>
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
    await DevOps.ready();
    await this.loadRepos();
  }
}

ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
        <PullRequestSearchApp />
    </SurfaceContext.Provider>,
    document.getElementById('root')
);
