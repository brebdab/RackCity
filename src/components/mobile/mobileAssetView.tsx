import {
  Alert,
  AnchorButton,
  Callout,
  Classes,
  Dialog,
  Intent,
  IToastProps,
  Position,
  Spinner,
  Toaster,
} from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import FormPopup from "../../forms/formPopup";
import { FormTypes } from "../../forms/formUtils";
import { API_ROOT } from "../../utils/api-config";
import {
  AssetCPObject,
  AssetObject,
  ChangePlan,
  DatacenterObject,
  ElementType,
  getChangePlanRowStyle,
  getHeaders,
  isAssetCPObject,
  MountTypes,
  NetworkConnection,
  Node,
  ROUTES,
  TableType,
} from "../../utils/utils";
import {
  decommissionAsset,
  deleteAsset,
  modifyAsset,
} from "../elementView/elementUtils";
import PropertiesView from "../elementView/detailedView/propertiesView";
import DecommissionedPropertiesView from "../elementView/detailedView/decommissionedPropertiesView";
// import "./assetView.scss";
import NetworkGraph from "../elementView/detailedView/assetView/graph";
import PowerView from "../elementView/powerView/powerView";
import { ALL_DATACENTERS } from "../elementView/elementTabContainer";
import { isNullOrUndefined } from "util";
import { PermissionState } from "../../utils/permissionUtils";
import { IconNames } from "@blueprintjs/icons";
import { BladePowerView } from "../elementView/powerView/bladePowerView";
import * as actions from "../../store/actions/state";
import ChassisView from "../elementView/detailedView/assetView/chassisView";

export interface MobileAssetViewProps {
  token: string;
  isAdmin: boolean;
  changePlan: ChangePlan;
  permissionState: PermissionState;
  markTablesStale(staleTables: TableType[]): void;
}

interface MobileAssetViewState {
  asset: AssetObject | AssetCPObject;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
  isDecommissionOpen: boolean;
  isAlertOpen: boolean;
  datacenters: Array<DatacenterObject>;
  powerShouldUpdate: boolean;
  loading: boolean;
  token?: string;
}

export class MobileAssetViewWrapper extends React.PureComponent<RouteComponentProps & MobileAssetViewProps> {
  render() {
    return (
        <MobileAssetView {...this.props} />
    )
  }
}

export class MobileAssetView extends React.PureComponent<
  RouteComponentProps & MobileAssetViewProps,
  MobileAssetViewState
> {
  public state: MobileAssetViewState = {
    asset: {} as AssetObject,
    isFormOpen: false,
    isDeleteOpen: false,
    isDecommissionOpen: false,
    isAlertOpen: false,
    datacenters: [],
    powerShouldUpdate: false,
    loading: false,
  };
  successfullyLoadedData = false;
  // private updateAsset = (asset: AssetObject, headers: any): Promise<any> => {
  //   let params: any;
  //   params = this.props.match.params;
  //   return modifyAsset(asset, headers, this.props.changePlan).then(
  //     (res: any) => {
  //       if (res.data.warning_message) {
  //         this.addWarnToast("Modifed asset. " + res.data.warning_message);
  //       } else {
  //         this.addSuccessToast(res.data.success_message);
  //       }
  //
  //       this.getData(params.rid, this.props.changePlan);
  //       this.props.markTablesStale([
  //         TableType.RACKED_ASSETS,
  //         TableType.STORED_ASSETS,
  //       ]);
  //     }
  //   );
  // };
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref),
  };

  getData(assetKey: string, changePlan: ChangePlan) {
    this.setState({
      loading: true,
    });
    const params: any = {};
    if (changePlan) {
      params["change_plan"] = changePlan.id;
    }
    const config = {
      headers: {
        Authorization: "Token " + this.state.token,
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
          loading: false,
        });
      })
      .catch((err) => {
        this.setState({
          asset: {} as AssetObject,
          loading: false,
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

  componentWillReceiveProps(
    nextProps: MobileAssetViewProps & RouteComponentProps
  ) {
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
    const headers = getHeaders(this.state.token);

    axios
      .post(API_ROOT + "api/sites/datacenters/get-many", {}, headers)
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
    let token: any;
    token = this.props.location.state;
    if (!this.successfullyLoadedData && token.detail) {
      this.setState({
        token: token.detail
      })
      let params: any;
      params = this.props.match.params;
      this.updateAssetData(params.rid);
      this.successfullyLoadedData = true;
    }
    if (this.state.datacenters.length === 0) {
      this.getDatacenters();
    }
    console.log(this.state);
    console.log(this.props);
    console.log(token);
    return (
      <div className={Classes.DARK + " asset-view"}>
        <Dialog className="spinner-dialog" isOpen={this.state.loading}>
          <Spinner />
        </Dialog>
        <Toaster
          autoFocus={false}
          canEscapeKeyClear={true}
          position={Position.TOP}
          ref={this.refHandlers.toaster}
        />
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
        <PropertiesView
          redirectToAsset={this.redirectToAsset}
          data={this.state.asset}
          title="Asset Properties"
        />
        {this.state.asset.model ? (
          <div>
            <AnchorButton
              disabled={
                !isNullOrUndefined(this.state.asset.decommissioning_user)
              }
              onClick={() =>
                this.props.history.push(
                  ROUTES.MODELS + "/" + this.state.asset.model.id
                )
              }
              className="model-detail"
              minimal
              icon={IconNames.DOCUMENT_OPEN}
              text="Go to model detail page"
            />
            <PropertiesView
              data={this.state.asset.model}
              title="Model Properties"
              data_override={() => {
                const {
                  cpu,
                  display_color,
                  storage,
                  memory_gb,
                } = this.state.asset;
                return { cpu, display_color, storage, memory_gb };
              }}
            />
          </div>
        ) : null}

        {this.state.asset.model &&
        this.state.asset.model.model_type !== MountTypes.RACKMOUNT ? (
          <div>
            {this.state.asset.model.model_type === MountTypes.BLADE &&
            this.state.asset.chassis ? (
              <AnchorButton
                disabled={
                  !isNullOrUndefined(this.state.asset.decommissioning_user)
                }
                onClick={() =>
                  this.redirectToAsset(this.state.asset.chassis!.id)
                }
                className="model-detail"
                minimal
                icon={IconNames.DOCUMENT_OPEN}
                text="Go to chassis detail page"
              />
            ) : null}
            <div className="propsview">
              <h3>Chassis Diagram</h3>

              {this.state.asset.model.model_type ===
              MountTypes.BLADE_CHASSIS ? (
                <ChassisView
                  chassis={this.state.asset}
                  redirectToAsset={this.redirectToAsset}
                />
              ) : this.state.asset.chassis ? (
                <ChassisView
                  chassis={this.state.asset.chassis}
                  redirectToAsset={this.redirectToAsset}
                />
              ) : null}
            </div>
          </div>
        ) : null}
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
        {this.renderPower()}
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
    if (this.state.asset && this.state.asset.model) {
      if (this.state.asset.model.model_type === MountTypes.BLADE) {
        return (
          <BladePowerView
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
      } else {
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
    } else {
      return;
    }
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

const mapDispatchToProps = (dispatch: any) => {
  return {
    markTablesStale: (staleTables: TableType[]) =>
      dispatch(actions.markTablesStale(staleTables)),
  };
};

export default withRouter(
  connect(mapStatetoProps, mapDispatchToProps)(MobileAssetViewWrapper)
);
