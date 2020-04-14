import * as React from "react";
import { RouteComponentProps, withRouter } from "react-router";
import { Callout, Intent, IToastProps, Toaster } from "@blueprintjs/core";
import axios from "axios";
import { API_ROOT } from "../../../utils/api-config";
import { connect } from "react-redux";
import { AssetObject, ChangePlan } from "../../../utils/utils";
import { PermissionState } from "../../../utils/permissionUtils";
import { IconNames } from "@blueprintjs/icons";

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

  private renderNoNetworkPortCallout() {
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
          ? null
          : this.renderNoNetworkPortCallout()}
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
