import {
  Alert,
  AnchorButton,
  Callout,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../../../forms/formPopup";
import { FormTypes } from "../../../../forms/formUtils";
import { API_ROOT } from "../../../../utils/api-config";
import {
  AssetObject,
  ElementType,
  getHeaders,
  NetworkConnection,
  Node,
  DatacenterObject,
  ROUTES,
  ChangePlan,
  AssetCPObject,
  getChangePlanRowStyle,
  isAssetCPObject,
} from "../../../../utils/utils";
import {
  deleteAsset,
  decommissionAsset,
  modifyAsset,
} from "../../elementUtils";
import PropertiesView from "../propertiesView";
import DecommissionedPropertiesView from "../decommissionedPropertiesView";
import "./assetView.scss";
import NetworkGraph from "./graph";
import PowerView from "../../powerView/powerView";
import { ALL_DATACENTERS } from "../../elementTabContainer";
import { IconNames } from "@blueprintjs/icons";
import { isNullOrUndefined } from "util";
import { PermissionState } from "../../../../utils/permissionUtils";
export interface AssetViewProps {
  token: string;
  isAdmin: boolean;
  changePlan: ChangePlan;
  permissionState: PermissionState;
}
// Given an rid, will perform a GET request of that rid and display info about that instnace

// var console: any = {};
// console.log = function() {};

interface AssetViewState {
  asset: AssetObject | AssetCPObject;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
  isDecommissionOpen: boolean;
  isAlertOpen: boolean;
  datacenters: Array<DatacenterObject>;
  powerShouldUpdate: boolean;
}

export class AssetView extends React.PureComponent<
  RouteComponentProps & AssetViewProps,
  AssetViewState
> {
  public state: AssetViewState = {
    asset: {} as AssetObject,
    isFormOpen: false,
    isDeleteOpen: false,
    isDecommissionOpen: false,
    isAlertOpen: false,
    datacenters: [],
    powerShouldUpdate: false,
  };
  successfullyLoadedData = false;
  private updateAsset = (asset: AssetObject, headers: any): Promise<any> => {
    let params: any;
    params = this.props.match.params;
    return modifyAsset(asset, headers, this.props.changePlan).then((res) => {
      if (res.data.warning_message) {
        this.addWarnToast("Modifed asset. " + res.data.warning_message);
      } else {
        this.addSuccessToast(res.data.success_message);
      }

      this.getData(params.rid, this.props.changePlan);

      this.handleFormClose();
    });
  };
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  getData(assetKey: string, changePlan: ChangePlan) {
    const params: any = {};
    if (changePlan) {
      params["change_plan"] = changePlan.id;
    }
    const config = {
      headers: {
        Authorization: "Token " + this.props.token,
      },

      params: params,
    };

    axios
      .get(API_ROOT + "api/assets/" + assetKey, config)
      .then((res) => {
        const data = res.data;
        return data;
      })
      .then((result) => {
        this.setState({
          asset: result,
          powerShouldUpdate: true,
        });
      })
      .catch((err) => {
        this.setState({
          asset: {} as AssetObject,
        });
        this.addErrorToast(err.response.data.failure_message);
      });
  }
  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING,
      action: {
        onClick: () => this.setState({ isFormOpen: true }),
        text: "Edit values",
      },
    });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };
  public updateAssetData = (rid: string) => {
    this.getData(rid, this.props.changePlan);
  };

  public updateAssetDataCP = (rid: string, changePlan: ChangePlan) => {
    this.getData(rid, changePlan);
  };

  componentWillReceiveProps(nextProps: AssetViewProps & RouteComponentProps) {
    if (nextProps.changePlan !== this.props.changePlan) {
      let params: any;
      params = this.props.match.params;
      this.updateAssetDataCP(params.rid, nextProps.changePlan);
    }
  }

  getNetworkConnectionForPort(port: string) {
    return this.state.asset.network_connections.find(
      (connection: NetworkConnection) => connection.source_port === port
    );
  }
  detectConflict(assetcp: AssetCPObject) {
    return (
      assetcp.is_conflict ||
      !isNullOrUndefined(assetcp.asset_conflict_location) ||
      !isNullOrUndefined(assetcp.asset_conflict_asset_name) ||
      !isNullOrUndefined(assetcp.asset_conflict_hostname)
    );
  }
  getDatacenters = () => {
    const headers = getHeaders(this.props.token);

    axios
      .post(API_ROOT + "api/datacenters/get-many", {}, headers)
      .then((res) => {
        const datacenters = res.data.datacenters as Array<DatacenterObject>;
        datacenters.push(ALL_DATACENTERS);
        this.setState({
          datacenters,
        });
      })
      .catch((err) => {});
  };
  public render() {
    if (!this.successfullyLoadedData && this.props.token) {
      console.log("render")
      let params: any;
      params = this.props.match.params;
      this.updateAssetData(params.rid);
      this.successfullyLoadedData=true;
    }
    if (this.state.datacenters.length === 0) {
      this.getDatacenters();
    }

    return (
      <div className={Classes.DARK + " asset-view"}>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
        {!this.state.asset.decommissioning_user ? (
          <div className="detail-buttons-wrapper">
            <div className={"detail-buttons"}>
              <AnchorButton
                intent="primary"
                icon="edit"
                text="Edit"
                minimal
                onClick={() => this.handleFormOpen()}
                disabled={
                  (isAssetCPObject(this.state.asset) &&
                    this.state.asset.is_decommissioned) ||
                  !(
                    this.props.permissionState.admin ||
                    this.props.permissionState.asset_management ||
                    (this.state.asset &&
                      this.state.asset.rack &&
                      this.props.permissionState.datacenter_permissions.includes(
                        +this.state.asset.rack.datacenter.id
                      ))
                  )
                }
              />
              <FormPopup
                datacenters={this.state.datacenters}
                isOpen={this.state.isFormOpen}
                initialValues={this.state.asset}
                type={FormTypes.MODIFY}
                elementName={ElementType.ASSET}
                handleClose={this.handleFormClose}
                submitForm={this.updateAsset}
              />
              <AnchorButton
                minimal
                intent="danger"
                icon="remove"
                text="Decommission"
                onClick={this.handleDecommissionOpen}
                disabled={
                  (isAssetCPObject(this.state.asset) &&
                    this.state.asset.is_decommissioned) ||
                  !(
                    this.props.permissionState.admin ||
                    this.props.permissionState.asset_management ||
                    (this.state.asset &&
                      this.state.asset.rack &&
                      this.props.permissionState.datacenter_permissions.includes(
                        +this.state.asset.rack.datacenter.id
                      ))
                  )
                }
              />
              <Alert
                cancelButtonText="Cancel"
                confirmButtonText="Decommission"
                intent="danger"
                isOpen={this.state.isDecommissionOpen}
                onCancel={this.handleDecommissionCancel}
                onConfirm={this.handleDecommission}
              >
                <p>
                  Are you sure you want to decommission this asset? This action
                  cannot be undone.
                </p>
              </Alert>
              <AnchorButton
                minimal
                intent="danger"
                icon="trash"
                text="Delete"
                onClick={this.handleDeleteOpen}
                disabled={
                  !isNullOrUndefined(this.props.changePlan) ||
                  !(
                    this.props.permissionState.admin ||
                    this.props.permissionState.asset_management ||
                    (this.state.asset &&
                      this.state.asset.rack &&
                      this.props.permissionState.datacenter_permissions.includes(
                        +this.state.asset.rack.datacenter.id
                      ))
                  )
                }
              />
              <Alert
                cancelButtonText="Cancel"
                confirmButtonText="Delete"
                intent="danger"
                icon="warning-sign"
                isOpen={this.state.isDeleteOpen}
                onCancel={this.handleDeleteCancel}
                onConfirm={this.handleDelete}
              >
                <p>
                  Are you sure you want to <b>delete</b> this asset? Unless it
                  was created in error, consider <b>decommissioning</b> instead.
                </p>
              </Alert>
            </div>
          </div>
        ) : null}
        {this.state.asset.decommissioning_user ? (
          <DecommissionedPropertiesView data={this.state.asset} />
        ) : null}
        {isAssetCPObject(this.state.asset) &&
        this.state.asset.is_decommissioned ? (
          <Callout
            className="propsview"
            intent={Intent.WARNING}
            title="This asset has been marked as decommissioned on this change plan. "
          >
            This asset will actually become decommissioned at the time of change
            plan execution, but no more modifications can be made to this asset.
          </Callout>
        ) : null}
        {isAssetCPObject(this.state.asset) &&
        this.detectConflict(this.state.asset) ? (
          <Callout
            className="propsview"
            intent={Intent.DANGER}
            title="This asset has conflicts "
          >
            Please go to change plan detail view for more details
          </Callout>
        ) : null}
        <PropertiesView data={this.state.asset} />
        <div className="propsview">
          <h3>Network Connections</h3>

          {this.state.asset.model &&
          this.state.asset.model.network_ports &&
          this.state.asset.model.network_ports.length !== 0 ? (
            <div className="network-connections">
              <table className="bp3-html-table bp3-html-table-bordered bp3-html-table-striped">
                <tr>
                  <th>Network Port</th>
                  <th>Mac Address</th>
                  <th>Destination Asset</th>
                  <th>Destination Port</th>
                </tr>
                <tbody>
                  {this.state.asset.model.network_ports.map((port: string) => {
                    var connection = this.getNetworkConnectionForPort(port);
                    return (
                      <tr>
                        {" "}
                        <td style={getChangePlanRowStyle(this.state.asset)}>
                          {port}
                        </td>
                        <td style={getChangePlanRowStyle(this.state.asset)}>
                          {this.state.asset.mac_addresses
                            ? this.state.asset.mac_addresses[port]
                            : null}
                        </td>{" "}
                        {connection
                          ? [
                              <td
                                style={getChangePlanRowStyle(this.state.asset)}
                                className={
                                  this.state.asset.decommissioning_user
                                    ? undefined
                                    : "asset-link"
                                }
                                onClick={
                                  this.state.asset.decommissioning_user
                                    ? undefined
                                    : (e: any) => {
                                        const id = this.getAssetIdFromHostname(
                                          connection!.destination_hostname!
                                        );
                                        if (id) {
                                          this.redirectToAsset(id);
                                        }
                                      }
                                }
                              >
                                {connection.destination_hostname}
                              </td>,
                              <td
                                style={getChangePlanRowStyle(this.state.asset)}
                              >
                                {connection.destination_port}
                              </td>,
                            ]
                          : [<td></td>, <td></td>]}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <NetworkGraph
                networkGraph={this.state.asset.network_graph}
                onClickNode={this.redirectToAsset}
                isDecommissioned={
                  this.state.asset.decommissioning_user !== undefined
                }
              />
            </div>
          ) : null}
        </div>

        {Object.keys(this.state.asset).length !== 0 ? this.renderPower() : null}
      </div>
    );
  }

  private getAssetIdFromHostname = (hostname: string) => {
    const node = this.state.asset.network_graph.nodes.find(
      (node: Node) => node.label === hostname
    );
    if (node) {
      return (node.id as unknown) as string;
    }
  };
  private redirectToAsset = (id: string) => {
    this.props.history.push(ROUTES.ASSETS + "/" + id);
    this.updateAssetData(id);
  };

  private renderPower() {
    return (
      <PowerView
        {...this.props}
        asset={this.state.asset}
        shouldUpdate={this.state.powerShouldUpdate}
        updated={() => {
          this.setState({ powerShouldUpdate: false });
        }}
        assetIsDecommissioned={
          this.state.asset.decommissioning_user !== undefined
        }
      />
    );
  }

  private handleFormOpen = () => {
    this.setState({
      isFormOpen: true,
    });
  };
  handleFormSubmit = () => {
    this.setState({
      isFormOpen: false,
    });
  };

  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDelete = () => {
    deleteAsset(this.state.asset!, getHeaders(this.props.token))
      .then((res) => {
        this.setState({ isDeleteOpen: false });
        this.addSuccessToast(res.data.success_message);
        this.props.history.push(ROUTES.DASHBOARD);
      })
      .catch((err) => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
      });
  };
  private handleDecommissionCancel = () =>
    this.setState({ isDecommissionOpen: false });
  private handleDecommissionOpen = () =>
    this.setState({ isDecommissionOpen: true });
  private handleDecommission = () => {
    decommissionAsset(
      this.state.asset!,
      getHeaders(this.props.token),
      this.props.changePlan
    )
      .then((res) => {
        this.setState({ isDecommissionOpen: false });
        this.addSuccessToast("Successfully Decommissioned Asset");
        let params: any;
        params = this.props.match.params;
        this.updateAssetData(params.rid);
      })
      .catch((err) => {
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER,
        });
      });
  };
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin,
    changePlan: state.changePlan,
    permissionState: state.permissionState,
  };
};

export default withRouter(connect(mapStatetoProps)(AssetView));
