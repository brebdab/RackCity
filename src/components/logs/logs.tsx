import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import {
    Classes,
    Pre,
    Tooltip,
    Position,
    Toaster,
    Intent,
    IToastProps,
    HTMLSelect,
    Icon,
} from "@blueprintjs/core";
import { RouteComponentProps } from "react-router";
import "../elementView//elementView.scss";
import { connect } from "react-redux";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";
import "./logs.scss";
import { PagingTypes } from "../elementView/elementUtils";
import { IconNames } from "@blueprintjs/icons";

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
    curr_page: number;
    total_pages: number;
    page_type: PagingTypes;
    updateLogs: boolean;
}
export function getLogPages(
    page_type: PagingTypes,
    token: string
) {
    const params =
        page_type === PagingTypes.ALL
            ? {}
            : {
                page_size: page_type,
            };
    const config = {
        headers: {
            Authorization: "Token " + token
        },
        params: params
    };
    return axios
        .post(API_ROOT + "api/logs/pages", {}, config)
        .then(res => {
            return res.data.page_count;
        });
}
class Logs extends React.Component<LogsProps & RouteComponentProps, LogsState> {
    public state: LogsState = {
        logs: [],
        state_loaded: false,
        search_query: undefined,
        curr_page: 1,
        total_pages: 0,
        page_type: 10,
        updateLogs: false
    };

    // Get
    getLogs = (
        page: number,
        page_type: PagingTypes,
        token: string
    ): Promise<Array<LogEntry>> => {
        this.handleDataUpdate(false);
        const config = {
            headers: {
                Authorization: "Token " + token
            },
            params: page_type === PagingTypes.ALL
                ? {}
                : {
                    page_size: page_type,
                    page
                }
        };
        return axios
            .post(API_ROOT + "api/logs/get-many", {}, config)
            .then(res => {
                return res.data.logs;
            });
    };

    public handleDataUpdate = (status: boolean) => {
        this.setState({
            updateLogs: status
        });
    };

    // Paging
    resetPage = () => {
        console.log("setting currpage to 1");
        this.setState({
            curr_page: 1
        });
    };
    previousPage = () => {
        if (this.state.curr_page > 1 && this.getLogs) {
            const next_page = this.state.curr_page - 1;
            this
                .getLogs(
                    next_page,
                    this.state.page_type,
                    this.props.token
                )
                .then(res => {
                    this.setState({
                        logs: res,
                        curr_page: next_page
                    });
                });
        }
    };
    nextPage = () => {
        if (this.state.curr_page < this.state.total_pages && this.getLogs) {
            const next_page = this.state.curr_page + 1;
            this
                .getLogs(
                    next_page,
                    this.state.page_type,
                    this.props.token
                )
                .then(res => {
                    this.setState({
                        logs: res,
                        curr_page: next_page
                    });
                });
        }
    };
    handlePagingChange = (page: PagingTypes) => {
        this.setState({
            page_type: page
        });
        this.updateData(page);
    };
    updateData = (page: PagingTypes) => {
        this.getLogs!(
            this.state.curr_page,
            page,
            this.props.token
        )
            .then(res => {
                this.setState({
                    logs: res
                });
            })
            .catch(err => {
                this.addToast({
                    message: err.response.data.failure_message,
                    intent: Intent.DANGER
                });
            });
        getLogPages(page, this.props.token)
            .then(res => {
                this.setState({
                    total_pages: res
                });
            });
    };

    //TOASTS
    private toaster: Toaster = {} as Toaster;
    private addToast = (toast: IToastProps) => {
        toast.timeout = 5000;
        this.toaster.show(toast);
    };
    private addSuccessToast = (message: string) => {
        this.addToast({ message: message, intent: Intent.PRIMARY });
    };
    private addErrorToast = (message: string) => {
        this.addToast({ message: message, intent: Intent.DANGER });
    };

    // Links
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
        // if (!this.state.state_loaded) {
        //     this
        //         .getLogs(
        //             this.props.token
        //         )
        //         .then(result => {
        //             const logs_array = result.logs
        //             console.log(logs_array)
        //             this.setState({
        //                 logs: logs_array,
        //                 state_loaded: true
        //             });
        //         });
        // }
        // console.log(this.state);
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

                <div className="table-control">
                    <HTMLSelect
                        onChange={(e: any) => this.handlePagingChange(e.target.value)}
                    >
                        {" "}
                        <option> {PagingTypes.TEN}</option>
                        <option>{PagingTypes.FIFTY}</option>
                        <option>{PagingTypes.ALL}</option>
                    </HTMLSelect>
                    {this.state.page_type !== PagingTypes.ALL
                        ? [
                            <span>
                                <Icon
                                    className="icon"
                                    icon={IconNames.CARET_LEFT}
                                    iconSize={Icon.SIZE_LARGE}
                                    onClick={() => this.previousPage()}
                                />
                            </span>,
                            <span>
                                page {this.state.curr_page} of {this.state.total_pages}
                            </span>,
                            <span>
                                <Icon
                                    className="icon"
                                    icon={IconNames.CARET_RIGHT}
                                    iconSize={Icon.SIZE_LARGE}
                                    onClick={() => this.nextPage()}
                                />
                            </span>
                        ]
                        : null}
                </div>
                <Pre>
                    {this.state.logs.map(log => this.getLinkedLog(log))}
                </Pre>
            </div>
        );
    }
}

const mapStateToProps = (state: any) => {
    return {
        token: state.token
    };
};

export default connect(mapStateToProps)(Logs);
