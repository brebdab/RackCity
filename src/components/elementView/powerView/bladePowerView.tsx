import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import {
  AnchorButton,
  Callout,
  Intent,
  IToastProps,
  Toaster,
} from "@blueprintjs/core";
import axios from "axios";
import { API_ROOT } from "../../../utils/api-config";
import { connect } from "react-redux";
import {
  AssetObject,
  ChangePlan,
  getChangePlanRowStyle,
  getHeaders,
} from "../../../utils/utils";
import { PermissionState } from "../../../utils/permissionUtils";
import { IconNames } from "@blueprintjs/icons";
import "./bladePowerView.scss";

interface BladePowerViewProps {
  token: string;
  callback?: Function;
  asset?: AssetObject;
  shouldUpdate: boolean;
  updated: Function;
  isAdmin: boolean;
  changePlan: ChangePlan;
  assetIsDecommissioned: boolean;
  permissionState: PermissionState;
}

interface BladePowerViewState {
  powerStatus?: boolean;
  username?: string;
  statusLoaded: boolean;
}

export class BladePowerView extends React.PureComponent<
  RouteComponentProps & BladePowerViewProps,
  BladePowerViewState
> {
  //TOASTS
  private toaster: Toaster = {} as Toaster;
  private addToast = (toast: IToastProps) => {
    toast.timeout = 5000;
    if (this.toaster) {
      this.toaster.show(toast);
    }
  };
  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };
  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  public state: BladePowerViewState = {
    powerStatus: undefined,
    statusLoaded: true,
  };

  componentDidMount() {}

  componentDidUpdate() {}

  private getUsername(token: string) {
    const headers = {
      headers: {
        Authorization: "Token " + token,
      },
    };
    axios
      .get(API_ROOT + "api/users/who-am-i", headers)
      .then((res) => {
        this.setState({ username: res.data.username });
      })
      .catch((err) => {});
  }

  private isBladePowerNetworkControlled() {
    const vendorBMI = "BMI";
    if (this.props.asset && this.props.asset.chassis) {
      return this.props.asset.chassis.model.vendor === vendorBMI;
    } else {
      return false;
    }
  }

  private requestPowerStatus() {
    axios
      .post(
        API_ROOT + "api/chassis-power/status",
        {
          chassis_id: this.props.asset!.chassis!.id,
          blade_slot: this.props.asset!.chassis_slot,
        },
        getHeaders(this.props.token)
      )
      .then((res) => {
        console.log(res.data.success_message);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  private requestPowerOn() {
    axios
      .post(
        API_ROOT + "api/chassis-power/on",
        {
          chassis_id: this.props.asset!.chassis!.id,
          blade_slot: this.props.asset!.chassis_slot,
        },
        getHeaders(this.props.token)
      )
      .then((res) => {
        console.log(res.data.success_message);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  private requestPowerOff() {
    axios
      .post(
        API_ROOT + "api/chassis-power/off",
        {
          chassis_id: this.props.asset!.chassis!.id,
          blade_slot: this.props.asset!.chassis_slot,
        },
        getHeaders(this.props.token)
      )
      .then((res) => {
        console.log(res.data.success_message);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  private requestPowerCycle() {
    axios
      .post(
        API_ROOT + "api/chassis-power/cycle",
        {
          chassis_id: this.props.asset!.chassis!.id,
          blade_slot: this.props.asset!.chassis_slot,
        },
        getHeaders(this.props.token)
      )
      .then((res) => {
        console.log(res.data.success_message);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  private renderPowerTable() {
    return (
      <div className="blade-power-table">
        <div className="network-connections">
          <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
            <tr>
              <th>Chassis Hostname</th>
              <th>Chassis Slot</th>
              <th>Power Status</th>
            </tr>
            <tbody>
              <tr>
                <td style={getChangePlanRowStyle(this.props.asset)}>
                  {this.props.asset?.chassis?.hostname}
                </td>
                <td style={getChangePlanRowStyle(this.props.asset)}>
                  {this.props.asset?.chassis_slot}
                </td>
                <td style={getChangePlanRowStyle(this.props.asset)}>
                  Status TBD
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <AnchorButton
          className={"blade-power-close"}
          intent={"primary"}
          minimal
          text={"Turn on"}
          icon="power"
          disabled={false}
        />
        <AnchorButton
          className={"blade-power-close"}
          intent={"warning"}
          minimal
          text={"Cycle Power"}
          icon="power"
          disabled={false}
        />
      </div>
    );
  }

  private renderNoPowerCallout() {
    return (
      <Callout
        title="Power is not network controllable in this blade chassis"
        icon={IconNames.INFO_SIGN}
      />
    );
  }

  render() {
    return (
      <div className="propsview">
        <h3>Power Connections</h3>
        {this.props.asset &&
        this.props.asset.chassis &&
        this.isBladePowerNetworkControlled()
          ? this.renderNoPowerCallout()
          : this.renderPowerTable()}
        {/*? this.renderPowerTable()*/}
        {/* this.renderNoPowerCallout()}*/}
      </div>
    );
  }
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
    changePlan: state.changePlan,
    permissionState: state.permissionState,
  };
};

export default withRouter(connect(mapStatetoProps)(BladePowerView));
