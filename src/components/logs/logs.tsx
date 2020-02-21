import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import { Classes, Pre, Tooltip, Position } from "@blueprintjs/core";
import { RouteComponentProps } from "react-router";
import "../elementView//elementView.scss";
import { connect } from "react-redux";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";
import "./logs.scss";
import { PagingTypes } from "../components/elementView/elementUtils";

interface LogEntry {
    id: number,
    date: string,
    log_content: string;
    user: number;
    related_asset?: number;
    related_model?: number;
}
interface LogsProps {
    token: string;
}
interface LogsState {
    logs: Array<LogEntry>;
    state_loaded: boolean;
    search_query?: string;
}
class Logs extends React.Component<LogsProps & RouteComponentProps, LogsState> {
    public state: LogsState = {
        logs: [],
        state_loaded: false,
        search_query: undefined
    };

    private getLinkedLog(log: LogEntry) {
        if (log.related_asset) {
            const id = log.related_asset.toString()
            return <div>
                <Tooltip content="Click to see related asset" position={Position.BOTTOM_RIGHT}>
                    <a className="log-link" href={"/assets/" + id}>{log.log_content}</a>
                </Tooltip>
            </div>
        } else if (log.related_model) {
            const id = log.related_model.toString()
            return <div>
                <Tooltip content="Click to see related model" position={Position.BOTTOM_RIGHT}>
                    <a className="log-link" href={"/models/" + id}>{log.log_content}</a>
                </Tooltip>
            </div >
        } else {
            return <div>
                <Tooltip content="Related object no longer exists" position={Position.BOTTOM_RIGHT}>
                    <p className="log-no-link">{log.log_content}</p>
                </Tooltip>
            </div>
        }
    }

    private handleSearchInputChange() {
        console.log("searching input change")
    }

    private handleSearch() {
        console.log("searching lmao")
    }

    public render() {
        if (!this.state.state_loaded) {
            getLogs(this.props.token).then(result => {
                const logs_array = result.logs
                console.log(logs_array)
                this.setState({
                    logs: logs_array,
                    state_loaded: true
                });
            });
        }
        console.log(this.state);
        return (
            <div className={Classes.DARK + " log-view"}>
                <h1>System Logs</h1>
                <div className={Classes.DARK + " bp3-input-group .modifier"}>
                    <span className="bp3-icon bp3-icon-search"></span>
                    <input
                        className="bp3-input .modifier"
                        type="search"
                        placeholder="Search logs by username, asset number, or asset hostname"
                        dir="auto"
                        value=""
                        onChange={() => this.handleSearchInputChange()}
                    />
                    <button
                        className="bp3-button bp3-minimal bp3-intent-primary bp3-icon-arrow-right .modifier"
                        onClick={() => this.handleSearch()}
                    ></button>
                </div>
                <Pre>
                    {this.state.logs.map(log => this.getLinkedLog(log))}
                </Pre>
            </div>
        );
    }
}

async function getLogs(token: string) {
    const headers = {
        headers: {
            Authorization: "Token " + token
        }
    };
    return await axios
        .post(
            API_ROOT + "api/logs/get-many",
            {},
            headers
        )
        .then(res => {
            return res.data;
        });
}

const mapStateToProps = (state: any) => {
    return {
        token: state.token
    };
};

export default connect(mapStateToProps)(Logs);
