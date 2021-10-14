import * as DevOps from "azure-devops-extension-sdk";
import { Filter, IFilterState } from "azure-devops-ui/Utilities/Filter";
import { ObservableValue } from "azure-devops-ui/Core/Observable";

import {
    CommonServiceIds,
    IHostNavigationService
} from "azure-devops-extension-api";

import {
    GitPullRequest,
    GitPullRequestSearchCriteria,
    GitRepository,
    PullRequestStatus
} from "azure-devops-extension-api/Git";

import {
    IdentityServiceIds,
    IIdentity,
    IVssIdentityService
} from "azure-devops-extension-api/Identities";

export const statusDisplayMappings = {
    "Active": PullRequestStatus.Active,
    "Rejected": PullRequestStatus.Active,
    "Awaiting Author": PullRequestStatus.Active,
    "Approved with suggestions": PullRequestStatus.Active,
    "Approved": PullRequestStatus.Active,
    "Awaiting Approval": PullRequestStatus.Active,
    "Draft": PullRequestStatus.Active,
    "Abandoned": PullRequestStatus.Abandoned,
    "Completed": PullRequestStatus.Completed,
    "All": PullRequestStatus.All
};

const notFilteredStatusDisplayMappings = {
    "Active": PullRequestStatus.Active,
    "Abandoned": PullRequestStatus.Abandoned,
    "Completed": PullRequestStatus.Completed,
    "All": PullRequestStatus.All
};

export const statusStrings = Object.keys(statusDisplayMappings);

function getStatusFromDisplayString(statusString: string) {
    if (statusString in statusDisplayMappings) {
        return statusDisplayMappings[statusString];
    }
    return PullRequestStatus.Active;
}

function computeStatus(pr: GitPullRequest): string {
    if (pr.status !== PullRequestStatus.Active) {
        return PullRequestStatus[pr.status];
    }
    if (pr.isDraft) {
        return "Draft";
    } else if (pr.reviewers.find(reviewer => reviewer.vote === -10)) {
        return "Rejected";
    } else if (pr.reviewers.find(reviewer => reviewer.vote === -5)) {
        return "Awaiting Author";
    } else if (pr.reviewers.find(reviewer => reviewer.vote === 5)) {
        return "Approved with suggestions";
    } else if (pr.reviewers.find(reviewer => reviewer.vote === 10)) {
        return "Approved";
    } else {
        return "Awaiting Approval";
    }
}

function ensureStatus(pr: GitPullRequest, status: string): boolean {
    if (status in notFilteredStatusDisplayMappings) {
        return pr.status === notFilteredStatusDisplayMappings[status];
    } else {
        return computeStatus(pr) === status;
    }
}

class WaitAndSee {
    private static controller?: AbortController;

    public static emit(): Promise<void> {
        if (this.controller) {
            this.controller.abort();
        }

        this.controller = new AbortController();
        const signal = this.controller.signal;
        return new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.controller = undefined;
                resolve();
            }, 1000);

            signal.addEventListener("abort", () => {
                clearTimeout(timeout);
                reject("cancelled");
            });
        });
    }
}

function subscribeFilter(
    filter: Filter,
    navigation: IHostNavigationService,
    refreshData: () => void
) {
    const cleanUp = {
        'title': '',
        'status': '',
        'creator': '',
        'reviewer': '',
        'startDate': '',
        'endDate': '',
        'repo': ''
    };

    function filterApplied(state: IFilterState) {
        const queryParamsToChange: { [key: string]: string; } = {};

        if ('title' in state) {
            const newValue = state['title']!.value as (string | undefined);
            queryParamsToChange['title'] = newValue === undefined ? ''
                : newValue;
        }

        ['startDate', 'endDate'].filter(key => key in state).forEach(date => {
            const newValue = state[date]!.value as (Date | undefined);
            queryParamsToChange[date] = newValue === undefined ? ''
                : Math.round(newValue.getTime()).toString();
        });

        ['creator', 'reviewer'].filter(key => key in state).forEach(identity => {
            const newValue = state[identity]!.value as (IIdentity | undefined);
            console.log(newValue);
            queryParamsToChange[identity] = newValue === undefined ? ''
                : newValue.originId;
        });

        if ('status' in state) {
            const newValue = state['status']!.value as string[];
            queryParamsToChange['status'] = newValue.length === 0 ? ''
                : statusStrings.indexOf(newValue[0]).toString();
        }

        if ('repo' in state) {
            const newValue = state['repo']!.value as string[];
            queryParamsToChange['repo'] = newValue.length === 0 ? ''
                : newValue[0];
        }

        return queryParamsToChange;
    }

    filter.subscribe((deltaState, action) => {
        if (action === 'reset-filters') {
            navigation.setQueryParams(cleanUp);
            refreshData();
        } else if (action === 'filter-applied') {
            navigation.setQueryParams(filterApplied(deltaState));
            WaitAndSee.emit().then(() => refreshData());
        }
    })
}

export async function updateFilter(
    filter: Filter,
    repos: GitRepository[],
    creatorIdentity: ObservableValue<IIdentity | undefined>,
    reviewerIdentity: ObservableValue<IIdentity | undefined>,
    refreshData: () => void
) {
    const navigation = await DevOps.getService<IHostNavigationService>(CommonServiceIds.HostNavigationService);
    const queryParams = await navigation.getQueryParams();

    const filterState: IFilterState = {};
    const queryParamsToRemove: { [key: string]: string; } = {};

    if ('title' in queryParams) {
        filterState['title'] = {
            value: queryParams['title']
        };
    }

    if ('status' in queryParams) {
        const index = Number.parseInt(queryParams['status']);
        if (isNaN(index) || index < 0 || index >= statusStrings.length - 1) {
            queryParamsToRemove['status'] = '';
        } else {
            filterState['status'] = {
                value: [statusStrings[index]]
            };
        }
    }

    const identityLoad = async (identityKey: string, value: ObservableValue<IIdentity | undefined>) => {
        if (identityKey in queryParams) {
            const service = await DevOps.getService<IVssIdentityService>(IdentityServiceIds.IdentityService);
            const identities = await service.searchIdentitiesAsync(queryParams[identityKey], undefined, undefined, 'uid');
            if (identities.length !== 1) {
                queryParamsToRemove[identityKey] = '';
            } else {
                value.value = identities[0];
                filterState[identityKey] = {
                    value: identities[0]
                };
            }
        }
    };

    await identityLoad('creator', creatorIdentity);
    await identityLoad('reviewer', reviewerIdentity);

    const dateLoad = (dateKey: string) => {
        if (dateKey in queryParams) {
            const dateInt = Number.parseInt(queryParams[dateKey]);
            if (isNaN(dateInt) || dateInt < 0) {
                queryParamsToRemove[dateKey] = '';
            } else {
                filterState[dateKey] = {
                    value: new Date(dateInt)
                };
            }
        }
    };

    dateLoad('startDate');
    dateLoad('endDate');

    if ('repo' in queryParams) {
        const index = repos.findIndex(item =>
            item.name === queryParams['repo']
            || item.name === queryParams['repo']);

        if (index !== -1) {
            filterState['repo'] = {
                value: [repos[index].name]
            };
        } else {
            queryParamsToRemove['repo'] = '';
        }
    }

    filter.setState(filterState);
    if (Object.keys(queryParamsToRemove).length > 0) {
        navigation.setQueryParams(queryParamsToRemove);
    }

    subscribeFilter(filter, navigation, refreshData);
}

export function createQueryCriteria(filterState: IFilterState): {
    criteria: GitPullRequestSearchCriteria;
    localFilter: (pr: GitPullRequest) => boolean;
} {
    const postFilter: ((pr: GitPullRequest) => boolean)[] = [];

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

    return {
        criteria: criteria as GitPullRequestSearchCriteria,
        localFilter: postFilter.length > 0 ? postFilter.reduce((prev, next) => pr => prev(pr) && next(pr)) : pr => true
    };
}
