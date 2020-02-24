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
    callback?: Function;
    asset?: AssetObject;
    shouldUpdate: boolean;
    updated: Function;
    isAdmin: boolean
}

interface PowerViewState {
    powerConnections: any;
    powerStatus: any;
    statusLoaded: boolean;
    alertOpen: boolean;
    confirmationMessage: string;
    username?: string
}

export class PowerView extends React.PureComponent<
    RouteComponentProps & PowerViewProps,
    PowerViewState
    > {

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

    private refHandlers = {
        toaster: (ref: Toaster) => (this.toaster = ref)
    };

    public state: PowerViewState = {
        powerConnections: undefined,
        powerStatus: undefined,
        statusLoaded: false,
        alertOpen: false,
        confirmationMessage: ""
    }

    componentDidMount() {
        axios.get(API_ROOT + "api/power/get-state/" + this.props.asset!.id, getHeaders(this.props.token))
            .then(res => {
                this.setState({
                    powerConnections: res.data.power_connections,
                    powerStatus: res.data.power_status,
                    statusLoaded: true
                })
            }).catch(err => {
                alert(err)
            })
        this.getUsername(this.props.token)
    }

    componentDidUpdate() {
        console.log("componentDIDUPDST")
        if (this.props.shouldUpdate) {
            console.log("here")
            axios.get(API_ROOT + "api/power/get-state/" + this.props.asset!.id, getHeaders(this.props.token))
                .then(res => {
                    this.setState({
                        powerConnections: res.data.power_connections,
                        powerStatus: res.data.power_status,
                        statusLoaded: true
                    })
                }).catch(err => {
                    alert(err)
                })
        }
        this.props.updated()
    }

    render() {

        return (
            <div className={Classes.DARK}>
                {this.state.statusLoaded ?
                    (this.state.powerConnections === undefined || Object.keys(this.state.powerConnections).length === 0 ?
                        <h4>No power connections</h4> :
                        Object.keys(this.state.powerConnections).map((port: string) => {
                            return (
                                <Card elevation={Elevation.TWO}>
                                    <div key={port} className={"row-power"}>
                                        <h3 className={"column-power"}>Asset Power Port: {port}</h3>
                                        <Divider />
                                        <h3 className={"column-power"}>
                                            PDU Port: {Object.keys(this.state.powerConnections[port]).map((field: string) => {
                                                return (
                                                    this.state.powerConnections[port][field]
                                                )
                                            })}
                                        </h3>
                                        <Divider />
                                        <h3 className={"column-power"}>{this.state.powerStatus[port]}</h3>
                                    </div>
                                </Card>
                            )
                        })) :
                    <Spinner />
                }
                <div className={"row-power"}>
                    {this.props.asset!.rack.is_network_controlled && this.state.powerStatus &&
                        (this.state.username === this.props.asset!.owner || this.props.isAdmin) ? <AnchorButton
                            className={"power-close"}
                            intent={this.state.powerStatus[Object.keys(this.state.powerStatus)[0]] === "OFF" ? "primary" : "danger"}
                            minimal
                            text={this.state.powerStatus[Object.keys(this.state.powerStatus)[0]] === "OFF" ?
                                "Turn on" : "Turn off"
                            }
                            icon="power"
                            onClick={this.state.powerStatus[Object.keys(this.state.powerStatus)[0]] === "OFF" ?
                                () => {
                                    this.setState({
                                        statusLoaded: !this.state.statusLoaded
                                    })
                                    axios.post(
                                        API_ROOT + "api/power/mask-on",
                                        { id: this.props.asset!.id },
                                        getHeaders(this.props.token)
                                    ).then(res => {
                                        this.setState({
                                            alertOpen: true,
                                            confirmationMessage: res.data.success_message
                                        })
                                        this.componentDidMount()
                                    }).catch(err => {
                                        alert(err)
                                    })
                                } :
                                () => {
                                    this.setState({
                                        statusLoaded: !this.state.statusLoaded
                                    })
                                    axios.post(
                                        API_ROOT + "api/power/mask-off",
                                        { id: this.props.asset!.id },
                                        getHeaders(this.props.token)
                                    ).then(res => {
                                        this.setState({
                                            alertOpen: true,
                                            confirmationMessage: res.data.success_message
                                        })
                                        this.componentDidMount()
                                    }).catch(err => {
                                        alert(err)
                                    })
                                }
                            }
                        /> : null}
                    {this.props.asset!.rack.is_network_controlled && this.state.powerStatus &&
                        (this.state.username === this.props.asset!.owner || this.props.isAdmin) ? <AnchorButton
                            className={"power-close"}
                            minimal
                            intent="warning"
                            text={"Cycle Power"}
                            onClick={() => {
                                this.setState({
                                    statusLoaded: !this.state.statusLoaded
                                })
                                axios.post(
                                    API_ROOT + "api/power/cycle",
                                    { id: this.props.asset!.id },
                                    getHeaders(this.props.token)
                                ).then(res => {
                                    this.setState({
                                        alertOpen: true,
                                        confirmationMessage: res.data.success_message
                                    })
                                    this.componentDidMount()
                                }).catch(err => {
                                    alert(err)
                                })
                            }}
                        /> : null}
                    <Divider />
                    {this.props.callback === undefined ? null :
                        <AnchorButton
                            className={"power-close"}
                            intent="danger"
                            minimal
                            text="Close"
                            onClick={() => {
                                this.setState({
                                    powerConnections: undefined,
                                    powerStatus: undefined,
                                    statusLoaded: false
                                })
                                this.props.callback!()
                            }}
                        />}
                </div>
                <Alert
                    className={Classes.DARK}
                    confirmButtonText="Okay"
                    isOpen={this.state.alertOpen}
                    onConfirm={() => {
                        this.setState({
                            alertOpen: false
                        })
                    }}
                    onClose={() => {
                        this.setState({
                            alertOpen: false
                        })
                    }}
                >
                    <p>{this.state.confirmationMessage}</p>
                </Alert>
                <Toaster
                    autoFocus={false}
                    canEscapeKeyClear={true}
                    position={Position.TOP}
                    ref={this.refHandlers.toaster}
                />
            </div >
        )
    }

    private getUsername(token: string) {
        const headers = {
            headers: {
                Authorization: "Token " + token
            }
        };
        axios
            .get(API_ROOT + "api/users/who-am-i", headers)
            .then(res => {
                this.setState({ username: res.data.username })
            })
            .catch(err => {
                console.log(err);
            });
    }

}

const mapStatetoProps = (state: any) => {
    return {
        token: state.token,
        isAdmin: state.admin
    };
};

export default withRouter(connect(mapStatetoProps)(PowerView));