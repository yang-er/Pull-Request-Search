import * as React from "react";
import { IdentityRef } from "azure-devops-extension-api/WebApi";
import { GitPullRequest, PullRequestAsyncStatus, PullRequestStatus } from "azure-devops-extension-api/Git";
import { IMeasurementStyle, ITableBreakpoint, ITableColumn, SimpleTableCell, Table, TableColumnLayout, TwoLineTableCell } from "azure-devops-ui/Table";
import { ZeroData, ZeroDataActionType } from "azure-devops-ui/ZeroData";
import { IIdentityDetailsProvider, VssPersona } from "azure-devops-ui/VssPersona";
import { PillGroup, PillGroupOverflow } from "azure-devops-ui/PillGroup";
import { Pill, PillSize, PillVariant } from "azure-devops-ui/Pill";
import { IReadonlyObservableValue, ObservableArray, ObservableValue } from "azure-devops-ui/Core/Observable";
import { Tooltip } from "azure-devops-ui/TooltipEx";
import { Icon } from "azure-devops-ui/Icon";
import { Card } from "azure-devops-ui/Card";
import { Ago } from "azure-devops-ui/Ago";
import { css } from "azure-devops-ui/Util";
import { ScreenBreakpoints } from "azure-devops-ui/Core/Util/Screen";

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
            <div className="relative" key={props.identity.id}>
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

const creatorColumn: ITableColumn<GitPullRequest> = {
    id: "creator",
    width: new ObservableValue(48),
    columnLayout: TableColumnLayout.twoLinePrefix,
    renderCell: (rowIndex, columnIndex, tableColumn, tableItem) => (
        <SimpleTableCell columnIndex={columnIndex} key={columnIndex} tableColumn={tableColumn}>
            <Persona identity={tableItem.createdBy} />
        </SimpleTableCell>
    )
};

const titleColumn: ITableColumn<GitPullRequest> = {
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
};

const reviewersColumn: ITableColumn<GitPullRequest> = {
    id: "reviewers",
    width: new ObservableValue(160),
    columnLayout: TableColumnLayout.singleLinePrefix,
    renderCell: (rowIndex, columnIndex, tableColumn, pr) => (
        <SimpleTableCell columnIndex={columnIndex} key={columnIndex} tableColumn={tableColumn}>
            {pr.reviewers.map(reviewer => (
                <Persona identity={reviewer} vote={reviewer.vote} />
            ))}
        </SimpleTableCell>
    )
};

const updatesColumn: ITableColumn<GitPullRequest> = {
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
};

const prTableColumns = [ creatorColumn, titleColumn, reviewersColumn, updatesColumn ];
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

export interface IPullRequestTableProps {
    pullRequests: ObservableArray<GitPullRequest | IReadonlyObservableValue<GitPullRequest | undefined>>;
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
                />
            </Card>
        );
    }
}
