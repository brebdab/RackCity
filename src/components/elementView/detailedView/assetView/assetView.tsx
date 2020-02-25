import {
  Alert,
  AnchorButton,
  Callout,
  Classes,
  Intent,
  IToastProps,
  Position,
  Toaster
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
  DatacenterObject
} from "../../../../utils/utils";
import { deleteAsset, modifyAsset } from "../../elementUtils";
import PropertiesView from "../propertiesView";
import "./assetView.scss";
import NetworkGraph from "./graph";
import PowerView from "../../powerView/powerView";
import { ALL_DATACENTERS } from "../../elementTabContainer";

export interface AssetViewProps {
  token: string;
  isAdmin: boolean;
}
// Given an rid, will perform a GET request of that rid and display info about that instnace

// var console: any = {};
// console.log = function() {};
function getData(assetkey: string, token: string) {
  const headers = {
    headers: {
      Authorization: "Token " + token
    }
  };
  console.log("getting_data");
  return axios.get(API_ROOT + "api/assets/" + assetkey, headers).then(res => {
    const data = res.data;
    return data;
  });
}

interface AssetViewState {
  asset: AssetObject;
  isFormOpen: boolean;
  isDeleteOpen: boolean;
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
    isAlertOpen: false,
    datacenters: [],
    powerShouldUpdate: false
  };
  private updateAsset = (asset: AssetObject, headers: any): Promise<any> => {
    console.log("updateAsset");
    let params: any;
    params = this.props.match.params;
    return modifyAsset(asset, headers).then(res => {
      if (res.data.warning_message) {
        this.addWarnToast("Modifed asset " + res.data.warning_message);
      } else {
        this.addSuccessToast("Successfuly modified asset");
      }

      getData(params.rid, this.props.token).then(result => {
        this.setState({
          asset: result,
          powerShouldUpdate: true
        });
      });

      this.handleFormClose();
    });
  };
  private toaster: Toaster = {} as Toaster;
  private addToast(toast: IToastProps) {
    toast.timeout = 5000;
    this.toaster.show(toast);
  }

  private refHandlers = {
    toaster: (ref: Toaster) => (this.toaster = ref)
  };

  private addSuccessToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.PRIMARY });
  };
  private addWarnToast = (message: string) => {
    this.addToast({
      message: message,
      intent: Intent.WARNING,
      action: {
        onClick: () => this.setState({ isFormOpen: true }),
        text: "Edit values"
      }
    });
  };
  private addErrorToast = (message: string) => {
    this.addToast({ message: message, intent: Intent.DANGER });
  };
  public updateAssetData = (rid: string) => {
    getData(rid, this.props.token).then(result => {
      this.setState({
        asset: result
      });
    });
    console.log(this.state.asset);
  };

  getNetworkConnectionForPort(port: string) {
    return this.state.asset.network_connections.find(
      (connection: NetworkConnection) => connection.source_port === port
    );
  }
  getDatacenters = () => {
    const headers = getHeaders(this.props.token);
    // console.log(API_ROOT + "api/datacenters/get-all");
    axios
      .post(API_ROOT + "api/datacenters/get-many", {}, headers)
      .then(res => {
        console.log(res.data.datacenters);
        const datacenters = res.data.datacenters as Array<DatacenterObject>;
        datacenters.push(ALL_DATACENTERS);
        this.setState({
          datacenters
        });
      })
      .catch(err => {
        console.log(err);
      });
  };
  public render() {
    console.log(this.state.asset);
    if (Object.keys(this.state.asset).length === 0) {
      let params: any;
      params = this.props.match.params;
      this.updateAssetData(params.rid);
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
        {this.props.isAdmin ? (
          <div className="detail-buttons-wrapper">
            <div className={"detail-buttons"}>
              <AnchorButton
                intent="primary"
                icon="edit"
                text="Edit"
                minimal
                onClick={() => this.handleFormOpen()}
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
                icon="trash"
                text="Delete"
                onClick={this.handleDeleteOpen}
              />
              <Alert
                cancelButtonText="Cancel"
                confirmButtonText="Delete"
                intent="danger"
                isOpen={this.state.isDeleteOpen}
                onCancel={this.handleDeleteCancel}
                onConfirm={this.handleDelete}
              >
                <p>Are you sure you want to delete?</p>
              </Alert>
            </div>
          </div>
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
                          <td>{port}</td>
                          <td>{this.state.asset.mac_addresses[port]}</td>{" "}
                          {connection
                            ? [
                              <td
                                className="asset-link"
                                onClick={(e: any) => {
                                  const id = this.getAssetIdFromHostname(
                                    connection!.destination_hostname!
                                  );
                                  if (id) {
                                    this.redirectToAsset(id);
                                  }
                                }}
                              >
                                {connection.destination_hostname}
                              </td>,
                              <td>{connection.destination_port}</td>
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
                />
              </div>
            ) : (
              <Callout title="No network ports" intent={Intent.PRIMARY}></Callout>
            )}
        </div>

        {Object.keys(this.state.asset).length !== 0 &&
          Object.keys(this.state.asset.power_connections).length > 0
          ? this.renderPower()
          : null}
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
    this.props.history.push("/assets/" + id);
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
      />
    );
  }

  private handleFormOpen = () => {
    this.setState({
      isFormOpen: true
    });
  };
  handleFormSubmit = () => {
    this.setState({
      isFormOpen: false
    });
  };

  private handleFormClose = () => this.setState({ isFormOpen: false });
  private handleDeleteCancel = () => this.setState({ isDeleteOpen: false });
  private handleDeleteOpen = () => this.setState({ isDeleteOpen: true });
  private handleDelete = () => {

    deleteAsset(this.state.asset!, getHeaders(this.props.token))
      .then(res => {
        this.setState({ isDeleteOpen: false });
        this.props.history.push("/");
      })
      .catch(err => {
        console.log("ERROR", err);
        this.addToast({
          message: err.response.data.failure_message,
          intent: Intent.DANGER
        });
      });
  };
}

const mapStatetoProps = (state: any) => {
  return {
    token: state.token,
    isAdmin: state.admin
  };
};

export default withRouter(connect(mapStatetoProps)(AssetView));
