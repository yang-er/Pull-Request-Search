import { GitRepository, GitRestClient } from "azure-devops-extension-api/Git";
import { runQuery, IQueryParams } from "./runQuery";
import { getContributionId, init, register } from "azure-devops-extension-sdk";

let identityCallback: () => void;
let identitiesLoaded: boolean = false;

/*
IdentityPicker.cacheAllIdentitiesInProject(VSS.getWebContext().project).then(() => {
    IdentityPicker.updatePickers();
    if (identityCallback) {
        identityCallback();
        identitiesLoaded = true;
    }
});
*/

// create controls
/*
const statusOptions: IComboOptions = {
    source: [
        "Active",
        "Abandoned",
        "Completed",
        "All",
        "Draft",
        "Awaiting Approval",
        "Awaiting Author",
        "Approved with suggestions",
        "Approved",
        "Rejected",
    ],
    value: "Active",
    dropOptions: {
        maxRowCount: 20
    }
};
const statusControl = <Combo>BaseControl.createIn(Combo, $(".status-picker"), statusOptions);

const creatorControl = <IdentityPicker>BaseControl.createIn(IdentityPicker, $(".creator-picker"), {});
const reviewerControl = <IdentityPicker>BaseControl.createIn(IdentityPicker, $(".reviewer-picker"), {});
const titleControl = <Combo>BaseControl.createIn(Combo, $(".title-box"), <IComboOptions>{ mode: "text" });
const startDateControl = <Combo>BaseControl.createIn(Combo, $(".start-date-box"), <IComboOptions>{ type: "date-time" });
const endDateControl = <Combo>BaseControl.createIn(Combo, $(".end-date-box"), <IComboOptions>{ type: "date-time" });
const repoControl = <Combo>BaseControl.createIn(Combo, $(".repo-picker"), <IComboOptions>{});
*/

let repositories: GitRepository[];
new GitRestClient({}).getRepositories().then(
    (repos) => {
        repositories = repos.sort((a, b) => a.name.localeCompare(b.name));
        console.log(repositories.map((r) => r.name));
        //repoControl.setSource(repositories.map((r) => r.name));
        
        // Intial query results
        runQueryFromParams();
    }
);
function getSelectedRepositoryId(): string | undefined {
    const idx = -1;
    return idx < 0 ? undefined : repositories[idx].id;
}

const params: IQueryParams = {
    status: "Active"
};

// event Logic
/*
creatorControl._bind("change", () => {
    if (creatorControl.getSelectedIndex() >= 0 || !creatorControl.getText()) {
        params.creatorId = creatorControl.selectedIdentityId();
        runQueryFromParams();
    }
});
reviewerControl._bind("change", () => {
    if (reviewerControl.getSelectedIndex() >= 0 || !reviewerControl.getText()) {
        params.reviewerId = reviewerControl.selectedIdentityId();
        runQueryFromParams();
    }
});
statusControl._bind("change", () => {
    if (statusControl.getSelectedIndex() < 0) {
        return;
    }
    params.status = statusControl.getValue() as string;
    runQueryFromParams();
});
titleControl._bind("change", () => {
    params.title = titleControl.getValue() as string;
    runQueryFromParams();
});
startDateControl._bind("change", () => {
    params.start = startDateControl.getValue() as Date;
    runQueryFromParams();
});
endDateControl._bind("change", () => {
    params.end = endDateControl.getValue() as Date;
    runQueryFromParams();
});
repoControl._bind("change", () => {
    if (repoControl.getSelectedIndex() >= 0 || !repoControl.getText()) {
        params.repositoryId = getSelectedRepositoryId();
        runQueryFromParams();
    }
});*/

$(".refresh").click(() => runQueryFromParams());
function runQueryFromParams() {
    runQuery(repositories, params);
}

register(
    getContributionId(),
    {}
);

init({
    applyTheme: true,
});
