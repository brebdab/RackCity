import { AnchorButton, Intent } from "@blueprintjs/core";
import "@blueprintjs/core/lib/css/blueprint.css";
import axios from "axios";
import * as React from "react";
import { connect } from "react-redux";
import { RouteComponentProps, withRouter } from "react-router";
import { API_ROOT } from "../../utils/api-config";
import "./import.scss";
import {
  ModelObject,
  RackObject,
  PowerConnection,
  DatacenterObject,
  AssetObject,
  TableType,
} from "../../utils/utils";
import * as actions from "../../store/actions/state";

interface ModifierProps {
  token: string;
  modelsModified?: Array<any>;
  modelsIgnored?: number;
  modelsAdded?: number;
  callback: (toasts: Array<string>, types: Array<string>) => void;
  operation: string;
  markTablesStale(staleTables: TableType[]): void;
}

export interface AssetObjectMod {
  [key: string]: any;
  asset_number: number;
  hostname: string;
  model: ModelObject;
  rack: RackObject;
  rack_position: string;
  chassis: AssetObject;
  chassis_slot: string;
  datacenter: DatacenterObject;
  offline_storage_site: DatacenterObject;
  owner?: string;
  comment?: string;
  id: string;
  power_port_connection_1: PowerConnection;
  power_port_connection_2: PowerConnection;
  display_color: string;
  cpu: string;
  storage: string;
  memory_gb: string;
}

export interface ModelObjectMod {
  [key: string]: any;
  vendor: string;
  model_number: string;
  mount_type: string;
  height: string;
  display_color?: string;
  network_ports?: string; //
  power_ports?: string; //
  cpu?: string;
  memory?: string; //
  storage?: string;
  comment?: string;
  id: string;
  network_port_name_1?: string;
  network_port_name_2?: string;
  network_port_name_3?: string;
  network_port_name_4?: string;
}

export interface NetworkConnection {
  source_port: string;
  destination_hostname: string;
  destination_port: string;
}

interface Check {
  model: any;
  checked: boolean;
}

interface ModifierState {
  modifiedModels: Array<Check>;
}

export class Modifier extends React.PureComponent<
  RouteComponentProps & ModifierProps,
  ModifierState
> {
  public state: ModifierState = {
    modifiedModels: [],
  };

  renderOneModification(obj: any, fields: any, model: any) {
    return ([
      <div className = "single-modification">
        <table className={"bp3-html-table"}>
          <thead>
            <tr>
              <th>Modified or Original?</th>
              {Object.keys(model).map((item: string) => {
                console.log("item: ");
                console.log(item);
                if (item !== "id") {
                  if (item === "power_connections") {
                    return <th></th>;
                  } else return <th>{fields[item]}</th>;
                }
                // TODO might need to make separate fields arrays based on this.props.operation
                else return <th> </th>;
              })}
              {this.props.operation === "assets" ? <th>Power Port 1</th> : null}
              {this.props.operation === "assets" ? <th>Power Port 2</th> : null}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Existing</td>
              {Object.keys(model).map((key: string) => {
                if (!obj.existing[key]) {
                  return <td> </td>;
                }
                if (key === "rack")
                  return (
                    <td>
                      {obj.existing.rack
                        ? obj.existing.rack.row_letter +
                          "" +
                          obj.existing.rack.rack_num
                        : null}
                    </td>
                  );
                else if (key === "chassis")
                  return (
                    <td>
                      {obj.existing.chassis
                        ? obj.existing.chassis.hostname
                        : null}
                    </td>
                  );
                else if (key === "datacenter")
                  return (
                    <td>
                      {obj.existing.datacenter
                        ? obj.existing.datacenter.abbreviation
                        : null}
                    </td>
                  );
                else if (key === "offline_storage_site")
                  return (
                    <td>
                      {obj.existing.offline_storage_site
                        ? obj.existing.offline_storage_site.abbreviation
                        : null}
                    </td>
                  );
                else if (key === "model")
                  return (
                    <td>
                      {obj.existing.model.vendor +
                        " " +
                        obj.existing.model.model_number}
                    </td>
                  );
                else if (key !== "id") {
                  if (key !== "power_connections") {
                    if (key === "network_ports" && obj.existing.network_ports) {
                      let str = "";
                      for (let i = 0; i < obj.existing[key].length; i++) {
                        str = str + obj.existing[key][i] + ", ";
                      }
                      return <td>{str.substring(0, str.length - 2)}</td>;
                    } else {
                      return <td>{obj.existing[key]}</td>;
                    }
                  } else {
                    return <td></td>;
                  }
                } else return <td> </td>;
              })}
              {this.props.operation === "assets"
                ? Object.keys(obj.existing.power_connections).map(
                    (portNum: string) => {
                      return (
                        <td>
                          {obj.existing.power_connections[portNum].left_right}
                          {obj.existing.power_connections[portNum].port_number}
                        </td>
                      );
                    }
                  )
                : null}
            </tr>
            <tr>
              <td>Modified</td>
              {Object.keys(model).map((key: string) => {
                if (key === "rack")
                  return (
                    <td>
                      {obj.modified.rack
                        ? obj.modified.rack.row_letter +
                          "" +
                          obj.modified.rack.rack_num
                        : null}
                    </td>
                  );
                else if (key === "chassis")
                  return (
                    <td>
                      {obj.modified.chassis
                        ? obj.modified.chassis.hostname
                        : null}
                    </td>
                  );
                else if (key === "datacenter")
                  return (
                    <td>
                      {obj.modified.datacenter
                        ? obj.modified.datacenter.abbreviation
                        : null}
                    </td>
                  );
                else if (key === "offline_storage_site")
                  return (
                    <td>
                      {obj.modified.offline_storage_site
                        ? obj.modified.offline_storage_site.abbreviation
                        : null}
                    </td>
                  );
                else if (key === "model")
                  return (
                    <td>
                      {obj.modified.model.vendor +
                        " " +
                        obj.modified.model.model_number}
                    </td>
                  );
                else if (key !== "id") {
                  if (key !== "power_connections") {
                    if (key === "network_ports" && obj.modified.network_ports) {
                      let str = "";
                      for (let i = 0; i < obj.modified[key].length; i++) {
                        str = str + obj.modified[key][i] + ", ";
                      }
                      return <td>{str.substring(0, str.length - 2)}</td>;
                    } else {
                      return <td>{obj.modified[key]}</td>;
                    }
                  } else {
                    return <td></td>;
                  }
                } else {
                  return <td> </td>;
                }
              })}
              {this.props.operation === "assets"
                ? Object.keys(obj.modified.power_connections).map(
                    (portNum: string) => {
                      return (
                        <td>
                          {obj.modified.power_connections[portNum].left_right}
                          {obj.modified.power_connections[portNum].port_number}
                        </td>
                      );
                    }
                  )
                : null}
            </tr>
          </tbody>
        </table>

      </div>     ,   <div className={"upload-button"}>
          <Checks
            {...this.props}
            linkedModel={obj.modified}
            callback={(model: any) => {
              var index = this.state.modifiedModels.findIndex(
                (element: Check) => {
                  return element.model === model;
                }
              );
              let check: Array<Check>;
              check = this.state.modifiedModels;
              check[index].checked = !check[index].checked;
              this.setState({
                modifiedModels: check,
              });
              // this.state.modifiedModels[index].checked = !this.state.modifiedModels[index].checked
            }}
          />
        </div>]
    );
  }

  renderModifications(model: any, fields: any) {
    let mods: Array<any> = [];
    for (let i = 0; i < this.props.modelsModified!.length; i++) {
      let obj = this.props.modelsModified![i];
      let checkObj: Check;
      checkObj = { model: obj.modified, checked: false };
      this.state.modifiedModels.push(checkObj);
      mods.push(this.renderOneModification(obj, fields, model));
    }
    return mods;
  }

  render() {
    if (this.props.modelsModified !== undefined) {
      let model: any;
      model = this.props.modelsModified[0].modified;
      let fields: any;
      if (this.props.operation === "models") {
        fields = {
          vendor: "Vendor",
          model_number: "Model Number",
          model_type: "Mount Type",
          height: "Height",
          display_color: "Display Color",
          network_ports: "Network Ports",
          power_ports: "Power Ports",
          cpu: "CPU",
          memory: "Memory",
          storage: "Storage",
          comment: "Comments",
          id: "",
          network_port_name_1: "Network Port #1 Name",
          network_port_name_2: "Network Port #2 Name",
          network_port_name_3: "Network Port #3 Name",
          network_port_name_4: "Network Port #4 Name",
        };
      } else if (this.props.operation === "assets") {
        fields = {
          asset_number: "Asset Number",
          hostname: "Hostname",
          model: "Model",
          rack: "Rack",
          rack_position: "Rack position",
          chassis: "Chassis",
          chassis_slot: "Chassis Slot",
          datacenter: "Datacenter",
          offline_storage_site: "Offline Storage Site",
          owner: "Owner",
          comment: "Comments",
          id: "",
          power_port_connection_1: "Power Port #1 Connection",
          power_port_connection_2: "Power Port #2 Connection",
          display_color: "Display Color",
          cpu: "CPU",
          storage: "Storage",
          memory_gb: "Memory",
        };
      } else if (this.props.operation === "network") {
        fields = {
          src_hostname: "Source Hostname",
          src_port: "Source Port",
          src_mac: "Source MAC",
          dest_hostname: "Destination Hostname",
          dest_port: "Destination Port",
        };
      }

      return (
        <div>
          {this.renderModifications(model, fields)}
          <h1> </h1>
          <AnchorButton
            className={"upload-button-import"}
            large={true}
            intent="primary"
            icon="import"
            text="Confirm Changes"
            onClick={() => {
              if (
                this.state.modifiedModels.length !== 0 &&
                this.props.operation === "models"
              ) {
                let modified: Array<ModelObjectMod>;
                modified = [];
                for (var i = 0; i < this.state.modifiedModels.length; i++) {
                  if (this.state.modifiedModels[i].checked)
                    modified.push(this.state.modifiedModels[i].model);
                }
                uploadModified(
                  modified,
                  this.props.token,
                  this.props.operation
                ).then(
                  (res) => {
                    console.log(this.props);
                    let toasts: Array<string>;
                    toasts = [];
                    let types: Array<string>;
                    types = [];
                    toasts.push(
                      "Success! Modified: " +
                        modified.length +
                        "; Added: " +
                        this.props.modelsAdded! +
                        "; Ignored: " +
                        (this.props.modelsIgnored! +
                          this.props.modelsModified!.length -
                          modified.length)
                    );
                    types.push(Intent.SUCCESS);
                    if (res.warning_message) {
                      toasts.push(res.warning_message);
                      types.push(Intent.WARNING);
                    }
                    this.setState({
                      modifiedModels: [],
                    });
                    this.props.callback(toasts, types);
                  },
                  (err) => {
                    this.props.callback(
                      [err.response.data.failure_message],
                      [Intent.DANGER]
                    );
                  }
                );
              } else if (
                this.state.modifiedModels.length !== 0 &&
                this.props.operation === "assets"
              ) {
                // TODO check this works and refactor
                let modified: Array<AssetObjectMod>;
                modified = [];
                for (i = 0; i < this.state.modifiedModels.length; i++) {
                  if (this.state.modifiedModels[i].checked)
                    modified.push(this.state.modifiedModels[i].model);
                }
                uploadModified(
                  modified,
                  this.props.token,
                  this.props.operation
                ).then(
                  (res) => {
                    let toasts: Array<string>;
                    toasts = [];
                    let types: Array<string>;
                    types = [];
                    toasts.push(
                      "Success! Modified: " +
                        modified.length +
                        "; Added: " +
                        this.props.modelsAdded! +
                        "; Ignored: " +
                        (this.props.modelsIgnored! +
                          this.props.modelsModified!.length -
                          modified.length)
                    );
                    types.push(Intent.SUCCESS);
                    if (res.warning_message) {
                      toasts.push(res.warning_message);
                      types.push(Intent.WARNING);
                    }
                    this.setState({
                      modifiedModels: [],
                    });
                    this.props.callback(toasts, types);
                  },
                  (err) => {
                    this.props.callback(
                      [err.response.data.failure_message],
                      [Intent.DANGER]
                    );
                  }
                );
              } else {
                let modified: Array<NetworkConnection>;
                modified = [];
                for (i = 0; i < this.state.modifiedModels.length; i++) {
                  if (this.state.modifiedModels[i].checked)
                    modified.push(this.state.modifiedModels[i].model);
                }
                uploadModified(
                  modified,
                  this.props.token,
                  this.props.operation
                ).then(
                  (res) => {
                    // this.addSuccessToast(
                    //   "Success! Modified: " +
                    //     modified.length +
                    //     "; Added: " +
                    //     this.props.modelsAdded! +
                    //     "; Ignored: " +
                    //     (this.props.modelsIgnored! +
                    //       this.props.modelsModified!.length -
                    //       modified.length)
                    // );
                    this.props.markTablesStale([
                      TableType.RACKED_ASSETS,
                      TableType.STORED_ASSETS,
                      TableType.MODELS,
                    ]);
                    let toasts: Array<string>;
                    toasts = [];
                    let types: Array<string>;
                    types = [];
                    toasts.push(
                      "Success! Modified: " +
                        modified.length +
                        "; Added: " +
                        this.props.modelsAdded! +
                        "; Ignored: " +
                        (this.props.modelsIgnored! +
                          this.props.modelsModified!.length -
                          modified.length)
                    );
                    types.push(Intent.SUCCESS);
                    if (res.warning_message) {
                      toasts.push(res.warning_message);
                      types.push(Intent.WARNING);
                    }
                    this.setState({
                      modifiedModels: [],
                    });
                    this.props.callback(toasts, types);
                  },
                  (err) => {
                    this.props.callback(
                      [err.response.data.failure_message],
                      [Intent.DANGER]
                    );
                  }
                );
              }
            }}
          />
        </div>
      );
    } else {
      return <p>No data</p>;
    }
  }
}
// TODO make Array<ModelObjectMod any, assuming the POST header format is the same
async function uploadModified(
  modelList: Array<any>,
  token: string,
  operation: string
) {
  console.log(API_ROOT + "api/" + operation + "/bulk-approve");
  console.log(token);
  console.log(modelList);
  const headers = {
    headers: {
      Authorization: "Token " + token,
    },
  };
  if (operation === "network") {
    return await axios
      .post(
        API_ROOT + "api/assets/network-bulk-approve",
        { approved_modifications: modelList },
        headers
      )
      .then((res) => {
        const data = res.data;
        return data;
      });
  }
  return await axios
    .post(
      API_ROOT + "api/" + operation + "/bulk-approve",
      { approved_modifications: modelList },
      headers
    )
    .then((res) => {
      console.log(res.data);
      const data = res.data;
      return data;
    });
}

interface CheckboxProps {
  linkedModel: any;
  callback: Function;
}

class Checks extends React.PureComponent<RouteComponentProps & CheckboxProps> {
  constructor(props: any) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
  }

  render() {
    return (
      <label className={"bp3-control bp3-checkbox"}>
        <input type="checkbox" onChange={this.handleChange} />
        <span className={"bp3-control-indicator"}></span>
        Replace existing with modified?
      </label>
    );
  }

  private handleChange() {
    this.props.callback(this.props.linkedModel);
  }
}

const mapDispatchToProps = (dispatch: any) => {
  return {
    markTablesStale: (staleTables: TableType[]) =>
      dispatch(actions.markTablesStale(staleTables)),
  };
};

export default withRouter(connect(mapDispatchToProps)(Modifier));
