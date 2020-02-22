import {
    Classes,
    AnchorButton,
    Alert,
    Toaster,
    IToastProps,
    Position,
    Intent,
    Card,
    Elevation,
    Spinner,
    Divider
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { AssetObject, getHeaders } from "../../../utils/utils";
import "./powerView.scss";

interface PowerViewProps {
    token: string;
    callback: Function;
    asset?: AssetObject
}

interface PowerViewState {
    powerConnections: any;
    powerStatus: any;
    statusLoaded: boolean
}

export class PowerView extends React.PureComponent<
    RouteComponentProps & PowerViewProps,
    PowerViewState
    > {

    public state: PowerViewState = {
        powerConnections: undefined,
        powerStatus: undefined,
        statusLoaded: false
    }

    componentDidMount() {
        axios.get(API_ROOT + "api/power/get-state/" + this.props.asset!.id, getHeaders(this.props.token))
            .then(res => {
                this.setState({
                    powerConnections: res.data.power_connections,
                    powerStatus: res.data.power_status,
                    statusLoaded: true
                })
            })
    }

    render() {
        return (
            <div className={Classes.DARK}>
                {this.state.statusLoaded ?
                    (this.state.powerConnections === undefined ?
                        null :
                        Object.keys(this.state.powerConnections).map((port: string) => {
                            return (
                                <Card elevation={Elevation.TWO}>
                                    <div key={port} className={"row-power"}>
                                        <h6 className={"column-power"}>Asset Power Port: {port}</h6>
                                        <Divider />
                                        <h6 className={"column-power"}>
                                            PDU Port: {Object.keys(this.state.powerConnections[port]).map((field: string) => {
                                                return (
                                                    this.state.powerConnections[port][field]
                                                )
                                            })}
                                        </h6>
                                        <Divider />
                                        <h6 className={"column-power"}>{this.state.powerStatus[port]}</h6>
                                        <Divider />
                                        <AnchorButton
                                            className={"column-power"}
                                            intent={this.state.powerStatus[port] === "OFF" ? "primary" : "danger"}
                                            minimal
                                            text={"Toggle power"}
                                            icon="power"
                                        />
                                    </div>
                                </Card>
                            )
                        })) :
                    <Spinner />
                }
                <AnchorButton
                    intent="primary"
                    minimal
                    text="Close"
                    onClick={() => {
                        this.setState({
                            powerConnections: undefined,
                            powerStatus: undefined,
                            statusLoaded: false
                        })
                        this.props.callback()
                    }}
                />
            </div >
        )
    }

}

const mapStatetoProps = (state: any) => {
    return {
        token: state.token,
        isAdmin: state.admin
    };
};

export default withRouter(connect(mapStatetoProps)(PowerView));