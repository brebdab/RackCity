import {
    Classes,
    AnchorButton,
    Alert,
    Toaster,
    IToastProps,
    Position,
    Intent,
    Spinner
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { AssetObject, ElementType, getHeaders } from "../../../utils/utils";

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
                                Object.keys(this.state.powerConnections[port]).map((field: string) => {
                                    return (
                                        <p key={field}>{this.state.powerConnections[port][field]}</p>
                                    )
                                })
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
            </div>
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