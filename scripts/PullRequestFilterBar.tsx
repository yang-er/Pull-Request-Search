import * as React from "react";
import * as DevOps from "azure-devops-extension-sdk";
import { CommonServiceIds, IHostNavigationService, IProjectPageService } from "azure-devops-extension-api";
import { GitRepository, GitRestClient } from "azure-devops-extension-api/Git";
import { IIdentity } from "azure-devops-extension-api/Identities";
import { FilterBar } from "azure-devops-ui/FilterBar";
import { KeywordFilterBarItem } from "azure-devops-ui/TextFilterBarItem";
import { Filter, IFilterState } from "azure-devops-ui/Utilities/Filter";
import { DropdownFilterBarItem } from "azure-devops-ui/Dropdown";
import { IdentityPickerDropdownFilterBarItem } from "azure-devops-ui/IdentityPicker";
import { ObservableValue } from "azure-devops-ui/Core/Observable";

import { DatePickerFilterBarItem } from "azure-devops-ui-datepicker";
import { PeoplePickerProviderV2 } from "./PeoplePickerProviderV2";
import { statusStrings } from "./status";

const pickerProvider = new PeoplePickerProviderV2();

export interface IPullRequestFilterBarProps {
    repos: GitRepository[];
    filter: Filter;
    creatorIdentity: ObservableValue<IIdentity | undefined>;
    reviewerIdentity: ObservableValue<IIdentity | undefined>;
}

export function PullRequestFilterBar(props: IPullRequestFilterBarProps): JSX.Element {
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
                pickerProvider={pickerProvider}
                initialValue={props.creatorIdentity}
                editPlaceholder="Creator"
                placeholder="Creator"
            />

            <IdentityPickerDropdownFilterBarItem
                filterItemKey="reviewer"
                filter={props.filter}
                pickerProvider={pickerProvider}
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

export async function loadProject() {
    const projectService = await DevOps.getService<IProjectPageService>(CommonServiceIds.ProjectPageService);
    const project = await projectService.getProject();
    if (project === undefined) {
        throw "Unknown loading context.";
    }

    return project;
}

export async function loadRepos(projectId?: string) {
    const client = new GitRestClient({
        rootPath: 'https://dev.azure.com/tlylz/'
    });

    return await client.getRepositories(projectId, true);
}

function subscribeFilter(filter: Filter, navigation: IHostNavigationService)
{
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
        } else if (action === 'filter-applied') {
            navigation.setQueryParams(filterApplied(deltaState));
        }
    })
}

export async function updateFilter(
    filter: Filter,
    repos: GitRepository[],
    creatorIdentity: ObservableValue<IIdentity | undefined>,
    reviewerIdentity: ObservableValue<IIdentity | undefined>)
{
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
            const service = await pickerProvider.identityService.getValue();
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

    subscribeFilter(filter, navigation);
}
