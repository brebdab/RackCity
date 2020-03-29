import "@blueprintjs/core/lib/css/blueprint.css";
import * as React from "react";
import {
    Classes,
    Pre,
    Tooltip,
    Position,
    HTMLSelect,
    Icon,
} from "@blueprintjs/core";
import { RouteComponentProps } from "react-router";
import "../elementView//elementView.scss";
import { connect } from "react-redux";
import { API_ROOT } from "../../utils/api-config";
import axios from "axios";
import "./logs.scss";
import {
    FilterTypes,
    TextFilterTypes,
    PagingTypes
} from "../elementView/elementUtils";
import { IconNames } from "@blueprintjs/icons";

export function getLogFilters(filterValue: string) {
    const username_filter = {
        field: "user__username",
        filter_type: FilterTypes.TEXT,
        filter: {
            value: filterValue,
            match_type: TextFilterTypes.CONTAINS
        }
    }
    const hostname_filter = {
        field: "related_asset__hostname",
        filter_type: FilterTypes.TEXT,
        filter: {
            value: filterValue,
            match_type: TextFilterTypes.CONTAINS
        }
    }
    if (Number(filterValue)) {
        const asset_number_filter = {
            field: "related_asset__asset_number",
            filter_type: FilterTypes.NUMERIC,
            filter: {
                max: Number(filterValue),
                min: Number(filterValue)
            }
        }
        return [username_filter, hostname_filter, asset_number_filter]
    } else {
        return [username_filter, hostname_filter]
    }
}
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
    curr_page: number;
    total_pages: number;
    page_type: PagingTypes;
    search_query?: string;
    filters?: Array<any>;
    is_state_loaded: boolean;
}
class Logs extends React.Component<LogsProps & RouteComponentProps, LogsState> {
    public state: LogsState = {
        logs: [],
        curr_page: 1,
        total_pages: 0,
        page_type: PagingTypes.FIFTY,
        search_query: undefined,
        filters: undefined,
        is_state_loaded: false
    };
    private getTotalPages = async (
        page_size: number,
        filters?: Array<any>
    ): Promise<number> => {
        const config = {
            headers: {
                Authorization: "Token " + this.props.token
            },
            params: {
                page_size
            }
        };
        const body = (filters !== undefined) ? {
            "filters": filters
        } : {}
        return await axios
            .post(API_ROOT + "api/logs/pages", body, config)
            .then(res => {
                return res.data.page_count;
            });
    }
    private getLogs = async (
        page: number,
        page_type: PagingTypes,
        filters?: Array<any>
    ): Promise<Array<LogEntry>> => {
        const config = {
            headers: {
                Authorization: "Token " + this.props.token
            },
            params: (page_type === PagingTypes.ALL) ?
                {} : {
                    page_size: page_type,
                    page
                }
        };
        const body = (filters !== undefined) ? {
            "filters": filters
        } : {}
        return await axios
            .post(API_ROOT + "api/logs/get-many", body, config)
            .then(res => {
                return res.data.logs;
            });
    }
    private updateLogsAndPages = (
        page_number: number,
        page_type: PagingTypes,
        filters?: Array<any>
    ) => {
        this.getLogs(
            page_number,
            page_type,
            filters
        ).then(res => {
            this.setState({
                logs: res
            })
        })
        if (page_type !== PagingTypes.ALL) {
            this.getTotalPages(
                page_type,
                filters
            ).then(res => {
                this.setState({
                    total_pages: res
                })
            })
        }
    }
    private resetPage = () => {
        this.setState({
            curr_page: 1
        });
    };
    private previousPage = () => {
        if (this.state.curr_page > 1) {
            const next_page = this.state.curr_page - 1;
            this.getLogs(
                next_page,
                this.state.page_type
            ).then(res => {
                this.setState({
                    logs: res,
                    curr_page: next_page
                });
            });
        }
    };
    private nextPage = () => {
        if (this.state.curr_page < this.state.total_pages) {
            const next_page = this.state.curr_page + 1;
            this.getLogs(
                next_page,
                this.state.page_type
            ).then(res => {
                this.setState({
                    logs: res,
                    curr_page: next_page
                });
            });
        }
    };
    private handlePagingChange = (page: PagingTypes) => {
        this.resetPage();
        this.setState({
            page_type: page
        });
        this.updateLogsAndPages(1, page, this.state.filters);
    };
    private handleSearch = () => {
        if (this.state.search_query !== undefined) {
            const query_filters = getLogFilters(this.state.search_query)
            this.setState({
                filters: query_filters
            })
            this.resetPage();
            this.updateLogsAndPages(1, this.state.page_type, query_filters)
        } else {
            this.setState({
                filters: undefined
            })
            this.resetPage();
            this.updateLogsAndPages(1, this.state.page_type)
        }
    }
    private renderLinkedLog(log: LogEntry) {
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
                <Tooltip>
                    <p className="log-no-link">{log.log_content}</p>
                </Tooltip>
            </div>
        }
    }
    onFormSubmit = (e: any) => {
        e.preventDefault();
    }

    public render() {
        if (!this.state.is_state_loaded) {
            this.setState({
                is_state_loaded: true
            })
            this.updateLogsAndPages(
                this.state.curr_page,
                this.state.page_type,
                this.state.filters
            )
        }
        return (
            <div className={Classes.DARK + " log-view"}>
                <h1>Audit Logs</h1>
                <div className={Classes.DARK + " bp3-input-group .modifier"}>
                    <span className="search-span bp3-icon bp3-icon-search"></span>
                    <form onSubmit={this.onFormSubmit}>
                        <span></span>
                        <input
                            className="search-input bp3-input .modifier"
                            type="text"
                            placeholder="Search logs by username, asset number, or asset hostname"
                            dir="auto"
                            onChange={(e: any) =>
                                this.setState({
                                    search_query: e.currentTarget.value
                                })
                            }
                        />
                        <button
                            className="search-button bp3-button bp3-minimal bp3-intent-primary bp3-icon-arrow-right .modifier"
                            onClick={() => this.handleSearch()}
                        ></button>
                    </form>
                </div>
                <div className="page-control">
                    <HTMLSelect
                        onChange={(e: any) => this.handlePagingChange(e.target.value)}
                    >
                        {" "}
                        <option> {PagingTypes.FIFTY}</option>
                        <option>{PagingTypes.HUNDRED}</option>
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
                <div>
                    <Pre className="log-block">
                        {this.state.logs.map(log => this.renderLinkedLog(log))}
                    </Pre>
                </div>
            </div >
        );
    }
}

const mapStateToProps = (state: any) => {
    return {
        token: state.token
    };
};

export default connect(mapStateToProps)(Logs);
