import * as React from "react";
import { Ago } from "azure-devops-ui/Ago";
import { Card } from "azure-devops-ui/Card";
import { ScreenBreakpoints } from "azure-devops-ui/Core/Util/Screen";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { DatePickerFilterBarItem } from "azure-devops-ui-datepicker";
import { FilterBar } from "azure-devops-ui/FilterBar"
import { Header, TitleSize } from "azure-devops-ui/Header";
import { IHeaderCommandBarItem } from "azure-devops-ui/HeaderCommandBar";
import { Icon } from "azure-devops-ui/Icon";
import { Observer } from "azure-devops-ui/Observer";
import { Pill, PillSize, PillVariant } from "azure-devops-ui/Pill";
import { PillGroup, PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { css } from "azure-devops-ui/Util";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { IIdentityDetailsProvider, VssPersona } from "azure-devops-ui/VssPersona";
import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { IdentityRef } from "azure-devops-extension-api/WebApi";

import {
    GitPullRequest,
    GitRepository,
    PullRequestAsyncStatus,
    PullRequestStatus
} from "azure-devops-extension-api/Git";

import {
    ITableBreakpoint,
    ITableColumn,
    ITableRowDetails,
    SimpleTableCell,
    Table,
    TableColumnLayout,
    TableLoadingRow,
    TwoLineTableCell
} from "azure-devops-ui/Table";

import {
    IReadonlyObservableValue,
    ObservableArray,
    ObservableValue
} from "azure-devops-ui/Core/Observable";

import {
    IdentityPickerDropdownFilterBarItem,
    IPeoplePickerProvider,
    IIdentity
} from "azure-devops-ui/IdentityPicker";

import { statusStrings } from "./Filtering";

interface IPluginHeaderProps {
    onRefreshActivate: () => void;
}

export function PluginHeader(props: IPluginHeaderProps): JSX.Element {

    const bar: IHeaderCommandBarItem[] = [
        {
            iconProps: { iconName: 'Refresh' },
            id: 'refresh-page',
            text: 'Refresh',
            isPrimary: true,
            onActivate: props.onRefreshActivate
        },
        {
            id: 'write-review',
            text: 'Write a review',
            href: 'https://marketplace.visualstudio.com/items?itemName=liayang.pull-request-search',
            target: '_blank',
            important: false,
        },
        {
            id: 'report-issue',
            text: 'Report an issue',
            href: 'https://github.com/yang-er/Pull-Request-Search/issues',
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

    return (
        <Header
            title="Pull Request Search"
            commandBarItems={bar}
            titleSize={TitleSize.Large}
        />
    );
}

interface IPluginFilterBarProps {
    repos: GitRepository[];
    filter: Filter;
    creatorIdentity: ObservableValue<IIdentity | undefined>;
    reviewerIdentity: ObservableValue<IIdentity | undefined>;
    pickerProvider: IPeoplePickerProvider;
}

export function PluginFilterBar(props: IPluginFilterBarProps): JSX.Element {

    return (
        <FilterBar
            filter={props.filter}
            className="collapsed-filter-bar"
        >

            <KeywordFilterBarItem
                filterItemKey="title"
                placeholder="Filter by title"
            />

            <DropdownFilterBarItem
                filterItemKey="status"
                filter={props.filter}
                items={statusStrings.map(text => ({ id: text, text })).filter(i => i.text !== "All")}
                placeholder="Status"
            />

            <IdentityPickerDropdownFilterBarItem
                filterItemKey="creator"
                filter={props.filter}
                pickerProvider={props.pickerProvider}
                initialValue={props.creatorIdentity}
                editPlaceholder="Creator"
                placeholder="Creator"
            />

            <IdentityPickerDropdownFilterBarItem
                filterItemKey="reviewer"
                filter={props.filter}
                pickerProvider={props.pickerProvider}
                initialValue={props.reviewerIdentity}
                editPlaceholder="Reviewer"
                placeholder="Reviewer"
            />

            <DatePickerFilterBarItem
                filterItemKey="startDate"
                filter={props.filter}
                placeholder="Start Date"
                hasClearButton={true}
            />

            <DatePickerFilterBarItem
                filterItemKey="endDate"
                filter={props.filter}
                placeholder="End Date"
                hasClearButton={true}
            />

            <DropdownFilterBarItem
                filterItemKey="repo"
                filter={props.filter}
                items={props.repos.map(repo => ({
                    id: repo.name,
                    text: repo.name
                }))}
                showItemsWhileSearching={true}
                dismissOnSelect
                placeholder="Repo"
            />

        </FilterBar>
    );
}

function Persona(props: { identity: IdentityRef, vote?: number }): JSX.Element {
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
        let iconName = "CompletedSolid";
        let className = "approved";
        if (props.vote === -5) {
            iconName = "AwayStatus";
            className = "waiting";
        } else if (props.vote === -10) {
            iconName = "StatusErrorFull";
            className = "rejected";
        }

        return (
            <div className="relative" key={props.identity.id}>
                <VssPersona identityDetailsProvider={provider} size="small" />
                <Icon iconName={iconName} className={css("repos-pr-reviewer-vote absolute", className)} />
            </div>
        );
    } else if (props.vote !== undefined) {
        return (
            <div className="relative" key={props.identity.id}>
                <VssPersona identityDetailsProvider={provider} size="small" />
            </div>
        );
    } else {
        return (
            <VssPersona identityDetailsProvider={provider} size="medium" />
        );
    }
}

const prTableColumns: ITableColumn<GitPullRequest>[] = [
    {
        id: "creator",
        width: new ObservableValue(48),
        columnLayout: TableColumnLayout.twoLinePrefix,
        renderCell: (rowIndex, columnIndex, tableColumn, tableItem) => (
            <SimpleTableCell columnIndex={columnIndex} key={columnIndex} tableColumn={tableColumn}>
                <Persona identity={tableItem.createdBy} />
            </SimpleTableCell>
        )
    },
    {
        id: "title",
        width: new ObservableValue(-100),
        columnLayout: TableColumnLayout.twoLine,
        renderCell: (rowIndex, columnIndex, tableColumn, pr) => (
            <TwoLineTableCell
                columnIndex={columnIndex}
                tableColumn={tableColumn}
                line1={(
                    <>
                        <Tooltip overflowOnly>
                            <div role="button" className="body-l flex-self-center text-ellipsis">
                                {pr.title}
                            </div>
                        </Tooltip>
                        {pr.isDraft && (
                            <Pill
                                className="repos-pr-list-draft-pill flex-no-shrink margin-left-4"
                                size={PillSize.compact}
                                variant={PillVariant.outlined}
                            >
                                Draft
                            </Pill>
                        )}
                        {pr.status === PullRequestStatus.Completed && pr.completionOptions?.bypassPolicy && (
                            <Pill
                                className="repos-pr-list-conflicts-pill flex-no-shrink margin-left-4"
                                size={PillSize.compact}
                                variant={PillVariant.outlined}
                            >
                                Bypassed
                            </Pill>
                        )}
                        {pr.mergeStatus === PullRequestAsyncStatus.Conflicts && (
                            <Pill
                                className="repos-pr-list-conflicts-pill flex-no-shrink margin-left-4"
                                size={PillSize.compact}
                                variant={PillVariant.outlined}
                            >
                                Conflicts
                            </Pill>
                        )}
                        {pr.autoCompleteSetBy && pr.status === PullRequestStatus.Active && (
                            <Pill
                                className="repos-pr-list-auto-complete-pill flex-no-shrink margin-left-4"
                                size={PillSize.compact}
                                variant={PillVariant.outlined}
                            >
                                Auto-complete
                            </Pill>
                        )}
                        {pr.labels && (
                            <PillGroup
                                className="margin-left-8"
                                overflow={PillGroupOverflow.fade}
                            >
                                {pr.labels.map(label => (
                                    <Pill key={label.id} size={PillSize.compact}>
                                        {label.name}
                                    </Pill>
                                ))}
                            </PillGroup>
                        )}
                    </>
                )}
                line2={(
                    <div className="secondary-text body-s text-ellipsis">
                        {`${pr.createdBy.displayName} request !${pr.pullRequestId} into`}
                        <Icon iconName="GitLogo" className="padding-horizontal-4" />
                        {pr.repository.name}
                        <Icon iconName="OpenSource" className="padding-horizontal-4" />
                        <span className="monospaced-xs">{pr.targetRefName.replace("refs/heads/", "")}</span>
                    </div>
                )}
            />
        )
    },
    {
        id: "reviewers",
        width: new ObservableValue(160),
        columnLayout: TableColumnLayout.singleLinePrefix,
        renderCell: (rowIndex, columnIndex, tableColumn, pr) => (
            <SimpleTableCell columnIndex={columnIndex} key={columnIndex} tableColumn={tableColumn}>
                <div className="flex-row flex-center rhythm-horizontal-8">
                    {pr.reviewers.map(reviewer => (
                        <Persona identity={reviewer} vote={reviewer.vote} />
                    ))}
                </div>
            </SimpleTableCell>
        )
    },
    {
        id: "updates",
        width: new ObservableValue(250),
        columnLayout: TableColumnLayout.singleLine,
        renderCell: (rowIndex, columnIndex, tableColumn, pr) => (
            <SimpleTableCell columnIndex={columnIndex} key={columnIndex} tableColumn={tableColumn}>
                {pr.status === PullRequestStatus.Active ? (
                    <span>Created <Ago date={pr.creationDate} /></span>
                ) : pr.status === PullRequestStatus.Completed ? (
                    <span>Completed <Ago date={pr.closedDate} /></span>
                ) : pr.status === PullRequestStatus.Abandoned ? (
                    <span>Abandoned <Ago date={pr.closedDate} /></span>
                ) : (
                    <span>Unknwon</span>
                )}
            </SimpleTableCell>
        )
    }
];

const tableBreakpoints: ITableBreakpoint[] = [
    {
        breakpoint: ScreenBreakpoints.xsmall,
        columnWidths: [0, -100, 0, 0]
    },
    {
        breakpoint: ScreenBreakpoints.small,
        columnWidths: [0, -100, 0, 160]
    },
    {
        breakpoint: ScreenBreakpoints.medium,
        columnWidths: [48, -100, 160, 160]
    },
    {
        breakpoint: ScreenBreakpoints.large,
        columnWidths: [48, -100, 240, 250]
    },
    {
        breakpoint: ScreenBreakpoints.xlarge,
        columnWidths: [48, -100, 320, 250]
    }
];

interface IPluginTableProps {
    pullRequests: ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>;
    hasValue: ObservableValue<boolean>;
    loadMore?: () => void;
}

class TableLoadingRowV2<T> extends React.Component<{
    columns: Array<ITableColumn<T>>;
    details: ITableRowDetails<T>;
    rowIndex: number;
    onMount?: () => void;
}> {
    public render(): JSX.Element {
        return (
            <TableLoadingRow
                columns={this.props.columns}
                details={this.props.details}
                key={this.props.rowIndex}
                rowIndex={this.props.rowIndex}
            />
        );
    }

    public componentDidMount() {
        this.props.onMount && setTimeout(this.props.onMount, 500);
    }
}

export function PluginTable(props: IPluginTableProps) {
    return <Observer hasValue={props.hasValue}>
        {(observedProps: { hasValue: boolean }) => !observedProps.hasValue ? (
            <ZeroData
                className="margin-top-16"
                primaryText="No pull requests match the given criteria"
                secondaryText="Pull requests allow you to review code and help ensure quality before merge."
                imageAltText="No pull requests match the given criteria"
                imagePath="https://cdn.vsassets.io/ext/ms.vss-code-web/pr-list/Content/emptyPRList.e7LLYcW6Lt_C0mQv.svg"
            />
        ) : (
            <Card
                className="margin-top-16 flex-grow bolt-table-card"
                contentProps={{ contentPadding: false }}
            >
                <Table<GitPullRequest>
                    columns={prTableColumns}
                    containerClassName="h-scroll-auto"
                    itemProvider={props.pullRequests}
                    showLines={true}
                    showHeader={false}
                    tableBreakpoints={tableBreakpoints}
                    renderLoadingRow={(rowIndex, rowDetails) => (
                        <TableLoadingRowV2
                            columns={prTableColumns}
                            details={rowDetails}
                            key={rowIndex}
                            rowIndex={rowIndex}
                            onMount={() => props.loadMore && props.loadMore()}
                        />
                    )}
                />
            </Card>
        )}
    </Observer>;
}
