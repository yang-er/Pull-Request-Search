import { PullRequestStatus, GitPullRequest } from "azure-devops-extension-api/Git/index";

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

export function getStatusFromDisplayString(statusString: string) {
    if (statusString in statusDisplayMappings) {
        return statusDisplayMappings[statusString];
    }
    return PullRequestStatus.Active;
}

export function computeStatus(pr: GitPullRequest): string {
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

export function ensureStatus(pr: GitPullRequest, status: string): boolean {
    if (status in notFilteredStatusDisplayMappings) {
        return pr.status === notFilteredStatusDisplayMappings[status];
    } else {
        return computeStatus(pr) === status;
    }
}