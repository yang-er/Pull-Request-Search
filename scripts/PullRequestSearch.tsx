import * as React from "react";
import * as ReactDOM from "react-dom";
import "azure-devops-ui/Core/override.css";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";

ReactDOM.render(
    <SurfaceContext.Provider value={{ background: SurfaceBackground.neutral }}>
        <>
        
    <div id="header"></div>
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
        </>
    </SurfaceContext.Provider>,
    document.getElementById('root')
);
