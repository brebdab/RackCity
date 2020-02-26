import {
  Classes,
  AnchorButton,
  Alert,
  Toaster,
  IToastProps,
  Position,
  Intent,
  Spinner,
  Callout
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { API_ROOT } from "../../../utils/api-config";
import { RouteComponentProps, withRouter } from "react-router";
import { connect } from "react-redux";
import { AssetObject, getHeaders } from "../../../utils/utils";
import "./powerView.scss";
import { IconNames } from "@blueprintjs/icons";

interface PowerViewProps {
  token: string;
  callback?: Function;
  asset?: AssetObject;
  shouldUpdate: boolean;
  updated: Function;
  isAdmin: boolean;
}

interface PowerViewState {
  powerConnections: any;
  powerStatus: any;
  statusLoaded: boolean;
  alertOpen: boolean;
  confirmationMessage: string;
  username?: string;
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
  };

  componentDidMount() {
    axios
      .get(
        API_ROOT + "api/power/get-state/" + this.props.asset!.id,
        getHeaders(this.props.token)
      )
      .then(res => {
        this.setState({
          powerConnections: res.data.power_connections,
          powerStatus: res.data.power_status,
          statusLoaded: true
        });
      })
      .catch(err => {
        this.addErrorToast(err.response.data.failure_message);
        this.setState({
          statusLoaded: true
        });
      });
    this.getUsername(this.props.token);
  }

  componentDidUpdate() {
    console.log("componentDIDUPDST");
    if (this.props.shouldUpdate) {
      console.log("here");
      axios
        .get(
          API_ROOT + "api/power/get-state/" + this.props.asset!.id,
          getHeaders(this.props.token)
        )
        .then(res => {
          this.setState({
            powerConnections: res.data.power_connections,
            powerStatus: res.data.power_status,
            statusLoaded: true
          });
        })
        .catch(err => {
          this.addErrorToast(err.response.data.failure_message);
          this.setState({
            statusLoaded: true
          });
        });
    }
    this.props.updated();
  }

  getPowerPortRows() {
    const rows = [];
    if (this.props.asset) {
      for (
        let i = 1;
        i < ((this.props.asset.model.num_power_ports as unknown) as number) + 1;
        i++
      ) {
        rows.push(
          <tr>
            <td>{i}</td>
            {this.props.asset!.power_connections[i] ? (
              <td>
                {this.props.asset!.power_connections[i].port_number}
                {this.props.asset!.power_connections[i].left_right}
              </td>
            ) : (
              <td></td>
            )}
            {this.props.asset!.rack.is_network_controlled ? (
              this.state.powerStatus ? (
                <td>{this.state.powerStatus[i]}</td>
              ) : (
                <td>Unable to contact PDU controller</td>
              )
            ) : (
              <td>PDU not network controlled</td>
            )}
          </tr>
        );
      }
    }
    return rows;
  }

  render() {
    return (
      <div className={Classes.DARK}>
        {this.state.statusLoaded ? (
          !(
            this.props.asset &&
            ((this.props.asset.model.num_power_ports as unknown) as number) > 0
          ) ? (
            <div className="propsview">
              <h3>Power Connections</h3>
              <Callout
                title="No power ports"
                icon={IconNames.INFO_SIGN}
              ></Callout>
              {this.props.callback === undefined ? null : (
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
                    });
                    this.props.callback!();
                  }}
                />
              )}
            </div>
          ) : (
            <div className="propsview">
              <h3>Power Connections</h3>
              <div className="network-connections">
                <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
                  <tr>
                    <th>Power Port Number</th>
                    <th>PDU Port Number</th>
                    <th>Power Status</th>
                  </tr>
                  <tbody>{this.getPowerPortRows()}</tbody>
                </table>
              </div>
              {this.props.asset!.rack.is_network_controlled &&
              Object.keys(this.props.asset!.power_connections).length > 0 &&
              this.state.powerStatus ? (
                <AnchorButton
                  className={"power-close"}
                  intent={
                    this.state.powerStatus[
                      Object.keys(this.state.powerStatus)[0]
                    ] === "OFF"
                      ? "primary"
                      : "danger"
                  }
                  minimal
                  text={
                    this.state.powerStatus[
                      Object.keys(this.state.powerStatus)[0]
                    ] === "OFF"
                      ? "Turn on"
                      : "Turn off"
                  }
                  icon="power"
                  onClick={
                    this.state.powerStatus[
                      Object.keys(this.state.powerStatus)[0]
                    ] === "OFF"
                      ? () => {
                          this.setState({
                            statusLoaded: !this.state.statusLoaded
                          });
                          axios
                            .post(
                              API_ROOT + "api/power/mask-on",
                              { id: this.props.asset!.id },
                              getHeaders(this.props.token)
                            )
                            .then(res => {
                              this.setState({
                                alertOpen: true,
                                confirmationMessage: res.data.success_message
                              });
                              this.componentDidMount();
                            })
                            .catch(err => {
                              alert(err);
                            });
                        }
                      : () => {
                          this.setState({
                            statusLoaded: !this.state.statusLoaded
                          });
                          axios
                            .post(
                              API_ROOT + "api/power/mask-off",
                              { id: this.props.asset!.id },
                              getHeaders(this.props.token)
                            )
                            .then(res => {
                              this.setState({
                                alertOpen: true,
                                confirmationMessage: res.data.success_message
                              });
                              this.componentDidMount();
                            })
                            .catch(err => {
                              alert(err);
                            });
                        }
                  }
                />
              ) : null}
              {this.props.asset!.rack.is_network_controlled &&
              Object.keys(this.props.asset!.power_connections).length > 0 &&
              this.state.powerStatus ? (
                <AnchorButton
                  className={"power-close"}
                  minimal
                  intent="warning"
                  text={"Cycle Power"}
                  onClick={() => {
                    this.setState({
                      statusLoaded: !this.state.statusLoaded
                    });
                    axios
                      .post(
                        API_ROOT + "api/power/cycle",
                        { id: this.props.asset!.id },
                        getHeaders(this.props.token)
                      )
                      .then(res => {
                        this.setState({
                          alertOpen: true,
                          confirmationMessage: res.data.success_message
                        });
                        this.componentDidMount();
                      })
                      .catch(err => {
                        alert(err);
                      });
                  }}
                />
              ) : null}
              {this.props.callback === undefined ? null : (
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
                    });
                    this.props.callback!();
                  }}
                />
              )}
            </div>
          )
        ) : (
          <Spinner />
        )}
        <Alert
          className={Classes.DARK}
          confirmButtonText="Okay"
          isOpen={this.state.alertOpen}
          onConfirm={() => {
            this.setState({
              alertOpen: false
            });
          }}
          onClose={() => {
            this.setState({
              alertOpen: false
            });
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
      </div>
    );
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
        this.setState({ username: res.data.username });
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
