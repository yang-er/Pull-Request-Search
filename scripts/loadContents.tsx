import { 
    GitPullRequest,
    GitRepository,
    GitBaseVersionDescriptor,
    GitTargetVersionDescriptor,
    GitVersionOptions,
    GitVersionType,
    GitCommitDiffs,
    GitCommitRef,
    VersionControlChangeType,
    GitRestClient,
} from "azure-devops-extension-api/Git";
import * as ReactDom from "react-dom";
import * as React from "react";
import { initializeContentsSearch } from "./searchContents";
import { IPrFile } from "./contentsContracts";
import { getHost, getUser } from "azure-devops-extension-sdk";

function getGitClient() : GitRestClient {
    return new GitRestClient({});
}

function setMessage(message: string) {
    ReactDom.render(
        <div>{message}</div>,
        document.getElementById("contents-message")!
    );
}

/**
 * Page through common diffs
 */
function getDiffItems(sourceId: string, targetId: string, repository: GitRepository, prev?: GitCommitDiffs) {
    const source = {
        version: sourceId,
        versionOptions: GitVersionOptions.None,
        versionType: GitVersionType.Commit
    } as GitBaseVersionDescriptor;
    const target = {
        version: targetId,
        versionOptions: GitVersionOptions.None,
        versionType: GitVersionType.Commit
    } as GitTargetVersionDescriptor;
    const skip = prev ? prev.changes.length : 0;
    return getGitClient().getCommitDiffs(repository.id,
        repository.project.name,
        true,
        100,
        skip,
        source,
        target
    ).then(diffs => {
        const page = diffs.changes.length === 100;
        if (prev) {
            diffs.changes.push(...prev.changes);
        }
        if (page) {
            return getDiffItems(sourceId, targetId, repository, diffs);
        }
        return diffs;
    });
}

function getDiffBlobs(diffs: GitCommitDiffs, repository: GitRepository): Promise<IPrFile[]> {
    const client = getGitClient();
    const toStrArr = (buffer: ArrayBuffer) => {
        var file = '';
        var bytes = new Uint8Array( buffer );
        var len = bytes.byteLength;
        for (var i = 0; i < len; i++) {
            file += String.fromCharCode( bytes[ i ] );
        }
        return file.split('\n');
    };
    return Promise.all(
        diffs.changes.filter(c => c.item.gitObjectType === "blob" as any
            && (
                c.changeType === VersionControlChangeType.Add ||
                c.changeType === VersionControlChangeType.Edit ||
                c.changeType === VersionControlChangeType.Delete
            )).map(d => {
            if (d.changeType === VersionControlChangeType.Add) {
                return client.getBlobContent(repository.id, d.item.objectId, repository.project.id, false)
                .then(c => {
                    return {
                        path: d.item.path,
                        changeType: VersionControlChangeType.Add,
                        text: toStrArr(c)
                    } as IPrFile;
                });
            } else if (d.changeType === VersionControlChangeType.Delete) {
                return client.getBlobContent(repository.id, d.item.originalObjectId, repository.project.id, false)
                .then(c => {
                    return {
                        path: d.item.path,
                        changeType: VersionControlChangeType.Delete,
                        originalText: toStrArr(c)
                    } as IPrFile;
                });
            } else {
                return Promise.all([
                    client.getBlobContent(repository.id, d.item.originalObjectId, repository.project.id, false),
                    client.getBlobContent(repository.id, d.item.objectId, repository.project.id, false)
                ]).then(([originalBuffer, buffer]) => {
                    return {
                        path: d.item.path,
                        changeType: VersionControlChangeType.Edit,
                        originalText: toStrArr(originalBuffer),
                        text: toStrArr(buffer)
                    } as IPrFile;
                });
            }
        })
    );
}

function getCommits(pullRequst: GitPullRequest, repository: GitRepository): Promise<[string, GitCommitRef[]]> {
    return getGitClient().getPullRequestCommits(repository.id, pullRequst.pullRequestId, repository.project.id)
        .then(prCommits => {
            console.log(prCommits);
            return getGitClient().getCommit(pullRequst.lastMergeCommit.commitId, repository.id, repository.project.id, 0)
                .then((commit): [string, GitCommitRef[]] => {
                    return [commit.parents[0], prCommits];
                });
        });
}

export function loadAndShowContents(pullRequest: GitPullRequest, repository: GitRepository): void {
    $("#pull-request-search-container").hide();
    $("#pull-request-contents-search-container").show();

    console.log(getHost(), getUser());
    const uri = getHost().id;// VSS.getWebContext().host.uri;
    const project = getHost().id; //VSS.getWebContext().project.name;
    const team = getHost().id;// VSS.getWebContext().team.name;
    const prUrl = pullRequest.repository.name ?
        `${uri}${project}/${team}/_git/${pullRequest.repository.name}/pullrequest/${pullRequest.pullRequestId}`
        :
        `${uri}_git/${this.props.repository.project.name}/pullrequest/${pullRequest.pullRequestId}`;
    $(".contents-title").attr("href", prUrl).text(pullRequest.title);
    if (!pullRequest.lastMergeCommit) {
        setMessage("Cannot find merge commit for pull request");
        return;
    }

    setMessage("Loading pr commits...");
    getCommits(pullRequest, repository).then(([parentCommitId, prCommits]) => {
        setMessage("Loading diff items...");
        return getDiffItems(parentCommitId, prCommits[0].commitId, repository);
    }).then(diffItems => {
        setMessage("Loading diff blobs...");
        return getDiffBlobs(diffItems, repository);
    }).then(diffBlobs => {
        setMessage("");
        initializeContentsSearch(pullRequest, repository, diffBlobs);
    });
}
